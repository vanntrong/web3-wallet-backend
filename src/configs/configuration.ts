export default () => ({
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  },
  jwt: {
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
    access_token_expires_in: +process.env.ACCESS_TOKEN_EXPIRES_IN,
    refresh_token_secret: process.env.REFRESH_TOKEN_SECRET,
    refresh_token_expires_in: +process.env.REFRESH_TOKEN_EXPIRES_IN,
    mail_token_secret: process.env.MAIL_TOKEN_SECRET,
    mail_token_expires_in: +process.env.MAIL_TOKEN_EXPIRES_IN,
    forgot_password_token_secret: process.env.FORGOT_PASSWORD_SECRET,
    forgot_password_token_expires_in: +process.env.FORGOT_PASSWORD_EXPIRES_IN,
  },
  moralis: {
    api_key: process.env.MORALIS_API_KEY,
  },
  infura: {
    api_key: process.env.INFURA_API_KEY,
    key_secret: process.env.INFURA_API_KEY_SECRET,
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  expo: {
    accessToken: process.env.EXPO_ACCESS_TOKEN,
  },
});
