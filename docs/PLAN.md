# План за: Добави Stripe плащане в eshop-basic

1. **Set up your Node.js environment**: Make sure you have `Node.js` installed on your system and create a new project directory for the eshop-basic application.
2. Install necessary dependencies, including Stripe's official library by running:
   ```
   npm install stripe express body-parser
   ```
3. Create an Express server in your project's main file (e.g., app.js or index.js) with basic configuration to listen on port 3000 and set up middleware for parsing JSON request bodies.
4. Implement the `/create-payment-intent` endpoint as shown above, ensuring you have a valid Stripe secret key stored securely using environment variables (`process.env.STRIPE_SECRET_KEY`). You can use `dotenv` package or any other method to manage your secrets safely in production environments.

5. On the frontend side of eshop-basic (e.g., within an HTML file), add code for mounting and handling payments with Stripe Elements as shown above, replacing `'pk_test_your_publishable_key'` with a real publishable key obtained from your Stripe account.
6. Set up webhook endpoint `/webhook` in Express server to handle events sent by Stripe (e.g., `payment_intent.succeeded`). Make sure you have the corresponding secret (`STRIPE_WEBHOOK_SECRET`) stored securely and use it for verifying incoming webhooks as shown above.

By following these steps, you'll be able to integrate a working payment flow using Stripe PaymentIntents API into your eshop-basic application. Remember that this is just an overview; each step may require further customization based on the specific requirements of your project or additional features you want to implement (e.g., error handling improvements).