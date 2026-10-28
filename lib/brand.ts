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
  storyHeadline: "Every cinnamon roll tells a story that began at home.",
  story: [
    "What started as a family's love for warm, freshly baked cinnamon rolls soon became a tradition. There was something special about gathering around the table, sharing soft, sweet rolls straight from the oven, and creating moments that brought everyone a little closer together. Those simple moments of comfort, joy, and togetherness inspired us to turn our passion into something we could share with others.",
    "Driven by our love for baking and our desire to create memorable treats, Jef & Carey was born. We carefully craft each batch using quality ingredients, traditional techniques, and a whole lot of heart. From the rich cinnamon filling to the perfectly soft dough, every roll is made with the same care and attention that we would give to our own family's table.",
    "More than just a bakery, we believe that good food creates meaningful connections. Whether you're enjoying a quiet morning coffee, celebrating a special occasion, sending a thoughtful gift, or sharing a box with loved ones, we hope our bakes become part of your own cherished moments.",
    "Today, we're proud to share our family's favorite treats with our community, one freshly baked cinnamon roll at a time.",
    "From our family to yours, thank you for being part of the Jef & Carey story.",
  ],
  storyImageAlt: "A tray of Biscoff cinnamon rolls fresh from the oven",
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
  /** Shown in the photo strip on the home page. */
  gallery: ["/products/cover-1.jpg", "/products/original.jpg", "/products/chocolate.jpg", "/products/biscoff.jpg", "/products/cover-2.jpg"],
  storyImage: "/products/cover-2.jpg",
  /** Photo for a category tile on the home page; a category without one uses its first product's photo. */
  categoryCovers: { "Cinnamon Rolls": "/products/cover-1.jpg" } as Record<string, string>,
  social: "@jefandcarey",
};
