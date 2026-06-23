const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

// Webhook endpoint needs raw body parser BEFORE other body parsers
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured.' });
  }
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log(`Payment for Intent ${paymentIntent.id} succeeded!`);
    // Here you would typically fulfill the order in your database
  }

  res.json({ received: true });
});

// JSON and URL-encoded body parsing for other endpoints
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

const luxeProducts = [
  {
    id: 1,
    name: 'Aetheris Gold Chronograph',
    description: '18k gold-plated case, Swiss automatic movement, custom black crocodile leather strap.',
    price: 2499.00,
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 2,
    name: 'Lumina H1 Wireless',
    description: 'Acoustic perfection in anodized champagne gold and premium black lambskin leather.',
    price: 599.00,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 3,
    name: 'Aurelia Signet Ring',
    description: 'Crafted from solid 24k gold, engraved with a bespoke geometric monogram.',
    price: 899.00,
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=600&auto=format&fit=crop'
  }
];

app.get('/api/products', (req, res) => {
  res.json(luxeProducts);
});

app.get('/api/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_mock_key_stripe_not_configured'
  });
});

app.post('/create-payment-intent', async (req, res) => {
  if (!stripe) {
    // For testing and fallback if STRIPE_SECRET_KEY is not configured
    console.warn('STRIPE_SECRET_KEY is not set. Simulating Payment Intent creation.');
    return res.json({ clientSecret: 'mock_secret_123_stripe_not_configured' });
  }

  const { amount } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Amount in cents
      currency: 'bgn',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For local testing
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Luxe eShop listening on port ${PORT}`);
  });
}

module.exports = app;
