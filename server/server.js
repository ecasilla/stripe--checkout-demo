// Replace if using a different env file or config
require("dotenv").config({ path: "./.env" });
const express = require("express");
const app = express();
const { resolve } = require("path");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.use(express.static(process.env.STATIC_DIR));

const price_id = ''
// Use JSON parser for all non-webhook routes
app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

app.get("/", (req, res) => {
  const path = resolve(process.env.STATIC_DIR + "/index.html");
  res.sendFile(path);
});

app.get("/success", (req, res) => {
  const path = resolve(process.env.STATIC_DIR + "/success.html");
  res.sendFile(path);
});

app.get('/config', (req, res) => {
  res.json({
    pricing: {
      free: process.env.STRIPE_PRICE_FREE,
      picnic: process.env.STRIPE_PRICE_PICNIC,
      fiesta: process.env.STRIPE_PRICE_FIESTA,
      carnival: process.env.STRIPE_PRICE_CARNIVAL,
    },
    pub_key: process.env.STRIPE_PUBLISHABLE_KEY
  });
})

app.get('/checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.query.id, {
    expand: ['line_items']
  });
  res.json(session);
});

app.post('/create-checkout-session', async (req, res) => {
  const price_id = req.body.price_id
  const session = await stripe.checkout.sessions.create({
    success_url: 'http://localhost:3000/success?id={CHECKOUT_SESSION_ID}',
    cancel_url: 'http://localhost:3000/cancel',
    payment_method_types: ['card'],
    mode: 'subscription',
    allow_promotion_codes: true,
    line_items: [{
      price: price_id, // set this to a recurring price ID
      quantity: req.body.quantity,
      // beta: dynamic_tax_rates: ['txr_1HNQ1ICZ6qsJgndJHrR7sP23', 'txr_1HNQ1gCZ6qsJgndJzETNpfvW'],
    }],
  });
  res.json({
    id: session.id,
  });
});

// Stripe requires the raw body to construct the event
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      // On error, log and return the error message
      console.log(`❌ Error message: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Successfully constructed event
    console.log("✅ Success:", event.id);

    if(event.type == 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Checkout Session Completed for: ', session.id)
      console.log('Checkout Session Completed subscription: ', session.subscription)
      console.log('Checkout Session Completed customer: ', session.customer)
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  }
);

app.listen(3000, () => console.log(`Node server listening on port ${3000}!`));
