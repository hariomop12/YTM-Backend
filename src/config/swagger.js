const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const specs = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SoundWave API",
      version: "1.0.0",
      description: "YouTube Music Clone",
    },
    servers: [{ url: "http://localhost:3000" }],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: ["./src/routes/*.js"],  
});

module.exports = { specs, swaggerUi };


