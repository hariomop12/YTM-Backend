const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const nodemailer = require("nodemailer");
const User = require("../models/mysql/User");

const {
  JWT_SECRET,
  JWT_EXPIRES_IN = "59m",
  REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES = "7d",
  EMAIL_VERIFY_TOKEN_EXPIRES = "1d",
  PASSWORD_RESET_TOKEN_EXPIRES = "1h",
  APP_URL = "http://localhost:8080",
  FRONTEND_URL,
  SMTP_HOST,
  SMTP_PORT = 587,
  SMTP_USERNAME,
  SMTP_PASSWORD,
  SMTP_FROM,
} = process.env;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required for authentication");
}

if (!REFRESH_TOKEN_SECRET) {
  throw new Error("REFRESH_TOKEN_SECRET is required for authentication");
}

const CLIENT_URL = FRONTEND_URL || APP_URL;
const emailPort = Number(SMTP_PORT) || 587;
const smtpOptions = SMTP_HOST
  ? {
      host: SMTP_HOST,
      port: emailPort,
      secure: emailPort === 465,
      auth: SMTP_USERNAME && SMTP_PASSWORD ? { user: SMTP_USERNAME, pass: SMTP_PASSWORD } : undefined,
    }
  : null;
const mailer = smtpOptions ? nodemailer.createTransport(smtpOptions) : null;
const emailFrom = SMTP_FROM || SMTP_USERNAME || SMTP_HOST;

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  display_name: Joi.string().min(3).max(100).required(),
  password: Joi.string().min(8).max(128).required(),
  avatar_url: Joi.string().uri().optional().allow(null, ""),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(128).required(),
});

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  display_name: user.display_name,
  avatar_url: user.avatar_url,
  role: user.role,
  is_verified: user.is_verified,
});

const createAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const createRefreshToken = (user) =>
  jwt.sign({ sub: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });

const createSessionTokens = async (user) => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  const hashedRefresh = await bcrypt.hash(refreshToken, 12);
  await user.update({ refresh_token: hashedRefresh }, { fields: ["refresh_token"] });
  return { accessToken, refreshToken };
};

const buildEmailToken = (user, type, expiresIn) =>
  jwt.sign({ sub: user.id, type }, JWT_SECRET, { expiresIn });

const sendMail = async ({ to, subject, text, html }) => {
  if (!mailer || !emailFrom) {
    console.warn("[auth] SMTP not configured, skipping email", subject, to);
    return false;
  }

  try {
    await mailer.sendMail({ from: emailFrom, to, subject, text, html });
    return true;
  } catch (err) {
    console.error("[auth] failed to send email", err.message);
    return false;
  }
};

const sendVerificationEmail = async (user, token) => {
  const url = `${CLIENT_URL}/api/auth/verify-email/${token}`;
  const text = `Hi ${user.display_name || user.email},\n\nClick the link below to verify your email for SoundWave: ${url}\n\nIf you did not register, you can ignore this message.`;
  const html = `<p>Hi ${user.display_name || user.email},</p><p>Click <a href="${url}">here</a> to verify your SoundWave account.</p><p>If you didn\'t register, ignore this e-mail.</p>`;
  return sendMail({ to: user.email, subject: "Verify your SoundWave email", text, html });
};

const sendResetPasswordEmail = async (user, token) => {
  const url = `${CLIENT_URL}/api/auth/reset-password?token=${token}`;
  const text = `Hi ${user.display_name || user.email},\n\nUse the link below to reset your SoundWave password: ${url}\n\nIf you didn\'t ask for a reset, you can ignore this message.`;
  const html = `<p>Hi ${user.display_name || user.email},</p><p>Use <a href="${url}">this link</a> to reset your SoundWave password.</p><p>If you didn't request a reset, feel free to ignore this e-mail.</p>`;
  return sendMail({ to: user.email, subject: "SoundWave password reset", text, html });
};

const validateEmailToken = (token, expectedType) => {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.type !== expectedType) {
    const err = new Error("Invalid token");
    err.statusCode = 400;
    throw err;
  }
  return payload;
};

const register = async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  const email = value.email.toLowerCase().trim();
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const password_hash = await bcrypt.hash(value.password, 12);
  const user = await User.create({
    email,
    display_name: value.display_name,
    password_hash,
    avatar_url: value.avatar_url || null,
    role: "listener",
  });

  const verificationToken = buildEmailToken(user, "verify_email", EMAIL_VERIFY_TOKEN_EXPIRES);
  await sendVerificationEmail(user, verificationToken);
  const tokens = await createSessionTokens(user);

  return res.status(201).json({
    message: "Registration successful",
    user: sanitizeUser(user),
    tokens,
  });
};

const login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  const email = value.email.toLowerCase().trim();
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const passwordsMatch = await bcrypt.compare(value.password, user.password_hash);
  if (!passwordsMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const tokens = await createSessionTokens(user);
  return res.json({ message: "Login successful", user: sanitizeUser(user), tokens });
};

const logout = async (req, res) => {
  await req.user.update({ refresh_token: null }, { fields: ["refresh_token"] });
  return res.json({ message: "Logged out" });
};

const refresh = async (req, res) => {
  const refreshToken = req.body.refresh_token || req.body.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({ message: "refresh_token is required" });
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const user = await User.findByPk(payload.sub);
  if (!user || !user.refresh_token) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const matches = await bcrypt.compare(refreshToken, user.refresh_token);
  if (!matches) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const tokens = await createSessionTokens(user);
  return res.json({ message: "Tokens refreshed", user: sanitizeUser(user), tokens });
};

const forgotPassword = async (req, res) => {
  const { error, value } = forgotSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  const email = value.email.toLowerCase().trim();
  const user = await User.findOne({ where: { email } });
  if (user) {
    const token = buildEmailToken(user, "reset_password", PASSWORD_RESET_TOKEN_EXPIRES);
    await sendResetPasswordEmail(user, token);
  }

  return res.json({ message: "If an account with that email exists, you will receive a reset link." });
};

const resetPassword = async (req, res) => {
  const { error, value } = resetSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  let payload;
  try {
    payload = validateEmailToken(value.token, "reset_password");
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || "Invalid or expired token" });
  }

  const user = await User.findByPk(payload.sub);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const password_hash = await bcrypt.hash(value.password, 12);
  await user.update({ password_hash, refresh_token: null }, { fields: ["password_hash", "refresh_token"] });
  return res.json({ message: "Password reset successful" });
};

const verifyEmail = async (req, res) => {
  const token = req.params.token;
  if (!token) {
    return res.status(400).json({ message: "Verification token is required" });
  }

  let payload;
  try {
    payload = validateEmailToken(token, "verify_email");
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || "Invalid or expired token" });
  }

  const user = await User.findByPk(payload.sub);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.is_verified) {
    return res.json({ message: "Email already verified" });
  }

  await user.update({ is_verified: true }, { fields: ["is_verified"] });
  return res.json({ message: "Email verified" });
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
