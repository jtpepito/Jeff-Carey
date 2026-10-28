const img = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/** Everything brand-specific lives here. Re-skin the starter by editing this file. */
export const brand = {
  name: "Jef&Carey",
  prefix: "JC",
  /** Provinces we deliver to, spelled as in data/ph-locations.json. Leave empty to deliver nationwide. */
  deliveryProvinces: ["Cebu"] as string[],
  heroEyebrow: "Cebu · Small batch · Baked to order",
  heroHeadline: "The oven goes on when your order comes in.",
  tagline: "Cinnamon rolls and cupcakes, baked in Cebu only after you order.",
  promise: "Real butter. Dough proofed overnight and frozen at its peak. Nothing is baked until you order, so your rolls arrive soft in the middle, with the bake date on the box.",
  storyHeadline: "It started with a school bake sale.",
  story: [
    "Jef&Carey started with a tray of cinnamon rolls for our son's school activity. The tray came home empty, the requests started coming in, and we have been baking to order ever since.",
    "We still make the dough the same way, with real butter and an overnight proof, in batches small enough to get right. Each batch is frozen at its peak, and nothing goes into the oven until an order comes in: soft centre, caramelised edges, frosting spread while the rolls are still warm.",
    "Every box carries its bake date. That date is the day we baked for you, and no one else.",
  ],
  storyImageAlt: "Freshly baked bread and pastries on bakery shelves",
  shippingCopy: [
    "We deliver within Cebu province only, so everything arrives fresh.",
    "Your order goes into the oven after it comes in and leaves our kitchen within 2 business days. Cebu City, Mandaue, Lapu-Lapu and Talisay usually get it the same day it leaves us; towns further out, the next day.",
    "Cash on delivery is available anywhere in Cebu. Delivery is free once your order reaches the free-delivery amount shown in your cart.",
  ],
  faqs: [
    { q: "Where do you deliver?", a: "We deliver within Cebu and selected nearby areas through our trusted delivery partners. Delivery fees vary depending on your location and will be confirmed before final booking." },
    { q: "Can I pick up my order instead?", a: "Yes! We offer scheduled pick-up for selected orders. Once your order is confirmed, we'll provide the pick-up location, date, and time. Please arrive within your scheduled window to ensure your bakes are at their freshest." },
    { q: "How does GCash payment work?", a: "Once your order is confirmed, we'll send you our GCash payment details. Simply send your payment, take a screenshot of the transaction, and message it to us as proof of payment. Your order will be processed once payment has been verified." },
    { q: "How long do your bakes stay fresh?", a: "Our bakes are made fresh to order. For the best taste and texture, we recommend enjoying them within 2-3 days of receiving your order. To extend freshness, store them in an airtight container and follow any storage instructions provided with your order." },
    { q: "What if something arrives damaged?", a: "We take great care in packaging every order. If your order arrives damaged, please send us clear photos within 24 hours of receiving it. We'll review the issue and work with you to find the best solution, whether that's a replacement, store credit, or another appropriate resolution." },
    { q: "How far in advance should I place my order?", a: "We recommend placing your order at least 2-3 days in advance to secure your preferred date. For large orders, special occasions, or custom requests, earlier booking is encouraged. You may send a message to Wryffens at 0917 677 8897 to discuss your requirements." },
    { q: "Do you accept custom orders?", a: "Yes! We'd love to help create something special. Send us details of what you have in mind, and we'll let you know the available options and pricing." },
    { q: "Do you accept orders for corporate giveaways?", a: "Absolutely! We accept bulk orders for corporate giveaways, client appreciation gifts, team events, and special occasions. We can discuss packaging options, personalized messages, and order quantities to suit your needs. To ensure availability and allow adequate preparation time, we recommend placing corporate orders as early as possible." },
  ],
  gallery: [
    img("1509365465985-25d11c17e812", 600),
    img("1551024601-bec78aea704b", 600),
    img("1499636136210-6f4ee915583e", 600),
    img("1533134242443-d4fd215305ad", 600),
    img("1550617931-e17a7b70dce2", 600),
    img("1606890737304-57a1ca8a5b62", 600),
  ],
  storyImage: img("1517433670267-08bbd4be890f", 1200),
  social: "@jefandcarey",
};
