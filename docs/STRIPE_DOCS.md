# Stripe PaymentIntents & Webhooks API Reference (2026)

## 1. Creating a Payment Intent (Backend - Node.js / Express)
Use the `stripe.paymentIntents.create` method. Do NOT use `stripe.charges.create` (deprecated).
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Amount in cents
      currency: 'bgn',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 2. Mounting Stripe Elements (Frontend - HTML/JS)
```html
<script src="https://js.stripe.com/v3/"></script>

<form id="payment-form">
  <div id="payment-element">
    <!-- Stripe Elements mounts here -->
  </div>
  <button id="submit">Pay Now</button>
  <div id="error-message"></div>
</form>

<script>
  const stripe = Stripe('pk_test_your_publishable_key');
  
  // Fetch clientSecret from your backend
  const clientSecret = '{{CLIENT_SECRET}}';
  
  const options = {
    clientSecret: clientSecret,
  };

  // Set up Stripe.js and Elements using the clientSecret
  const elements = stripe.elements(options);

  // Create and mount the Payment Element
  const paymentElement = elements.create('payment');
  paymentElement.mount('#payment-element');

  const form = document.getElementById('payment-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: 'https://example.com/checkout-complete',
      },
    });

    if (error) {
      const messageContainer = document.getElementById('error-message');
      messageContainer.textContent = error.message;
    }
  });
</script>
```

## 3. Stripe Webhook Handler (Backend - Express)
Ensure webhook payload is parsed as raw request body (`express.raw`).
```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      // Then define and call a function to handle the event payment_intent.succeeded
      console.log('PaymentIntent was successful:', paymentIntentSucceeded.id);
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  response.send();
});
```
