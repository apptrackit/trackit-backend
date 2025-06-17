const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TrackIt API Documentation',
      version: '1.0.0',
      description: `API documentation for the TrackIt application (${process.env.NODE_ENV})`,
    },
        servers: [
      {
        url: 'http://dev.ballabotond.com:4000',
        description: 'Development server',
      },
      {
        url: `http://localhost:${process.env.PORT}`,
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for user authentication'
        },
        AdminBearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for admin authentication'
        }
      }
    },
    security: [
      {
        BearerAuth: []
      },
      {
        AdminBearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js'], // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = specs;
