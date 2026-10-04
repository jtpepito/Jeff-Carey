const img = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/** Everything brand-specific lives here. Re-skin the starter by editing this file. */
export const brand = {
  name: "Bukid Lane",
  prefix: "BL",
  tagline: "Coffee, cacao and pantry staples, bought straight from Philippine farms.",
  promise: "Roasted and packed to order. Out our door within 2 business days.",
  story: [
    "We started with one sack of Benguet arabica and a borrowed roaster in a Quezon City garage.",
    "Today we buy from 14 smallholder farms in Benguet, Davao and Bukidnon, and we pay them before the harvest ships, not 90 days after.",
    "Every bag carries the farm's name and the roast or pack date, so you know exactly what you're drinking and how fresh it is.",
  ],
  shippingCopy: [
    "We pack orders within 2 business days and hand them to our courier the same afternoon.",
    "Metro Manila and Luzon: 2 to 5 days. Visayas and Mindanao: 4 to 8 days.",
    "Cash on delivery is available nationwide. Shipping is free once your order reaches the free-shipping amount shown in your cart.",
  ],
  faqs: [
    { q: "How long does delivery take?", a: "We pack within 2 business days. After that, expect 2 to 5 days for Metro Manila and Luzon, and 4 to 8 days for Visayas and Mindanao." },
    { q: "Can I pay cash on delivery?", a: "Yes, anywhere our courier delivers. Have the exact amount ready for the rider." },
    { q: "How does GCash payment work?", a: "Send the order total to the GCash number shown at checkout, then type the reference number from your GCash receipt into the form. We check it within a day and then pack your order." },
    { q: "How fresh is the coffee?", a: "We roast in small batches every week. Your bag shows its roast date, and it will be no more than 10 days old when it leaves us. It tastes best within 6 weeks of roasting." },
    { q: "What if something arrives damaged?", a: "Send us a photo within 7 days of delivery and we'll replace it or refund you, your choice." },
  ],
  gallery: [
    img("1447933601403-0c6688de566e", 600),
    img("1511381939415-e44015466834", 600),
    img("1587049352846-4a222e784d38", 600),
    img("1509042239860-f550ce710b93", 600),
    img("1495474472287-4d71bcdd2085", 600),
    img("1481391319762-47dff72954d9", 600),
  ],
  storyImage: img("1442512595331-e89e73853f31", 1200),
  social: "@bukidlane",
};
