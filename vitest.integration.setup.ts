/**
 * Environment for the integration suite.
 *
 * MONGODB_CONNECTION_URL is deliberately absent — `startTestServer()` sets it
 * to the in-memory server's URI before anything reads config, so there is no
 * way for this suite to reach a real database by accident.
 */
process.env.JWT_SECRET = "integration-jwt-secret-long-enough-to-not-warn"
process.env.RAZORPAY_KEY = "rzp_test_integration"
process.env.RAZORPAY_SECRET = "integration_razorpay_secret"
process.env.WEBHOOK_SECRET = "integration_webhook_secret"
process.env.CRON_SECRET = "integration_cron_secret"
process.env.FIELD_ENCRYPTION_KEY = "integration-field-encryption-key-32ch"
process.env.APP_BASE_URL = "https://integration.test"
process.env.MAIL_HOST = "smtp.integration.test"
process.env.MAIL_USER = "integration@test"
process.env.MAIL_PASS = "integration"
process.env.CLOUDINARY_CLOUD_NAME = "demo"
process.env.CLOUDINARY_API_KEY = "key"
process.env.CLOUDINARY_API_SECRET = "secret"
process.env.FOLDER_NAME = "IntegrationFolder"
process.env.ADMIN_SETUP_KEY = "integration-setup-key"
