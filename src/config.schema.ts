import * as Joi from '@hapi/joi';

export const configValidationSchema = Joi.object({
  STAGE: Joi.string().required(),
  DATABASE_URL: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_HOST: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  AWS_PUBLIC_BUCKET_NAME: Joi.string().required(),
  AWS_CLOUDFRONT_URL: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_REGION: Joi.string().required(),
  THROTTLE_TTL: Joi.number().required(),
  THROTTLE_LIMIT: Joi.number().required(),
  DEFAULT_PROFILE_URL: Joi.string().required(),
  // CORS_ORIGIN: Joi.string().when('STAGE', {
  //   is: 'production',
  //   then: Joi.required(),
  //   otherwise: Joi.optional(),
  // }),
  JWT_ACCESS_TOKEN_TTL: Joi.number().required(),
  JWT_REFRESH_TOKEN_TTL: Joi.number().required(),
  R2_ENDPOINT: Joi.string().required(),
});
