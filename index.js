import express from "express";

const app = express();

// CORS so Shopify can call this
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

// --- CONSTANTS ---
const TAX_RATE = 0.07; // 7%
const SHIPPING_PER_SHIPMENT = 8.0; // $8 per shipment per store

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// helper: extract store/domain from URL
function getStoreKey(url) {
  if (!url) return null;
  // some URLs have " OR " – just use the first
  const firstPart = url.split(" ")[0];
  try {
    const u = new URL(firstPart);
    return u.hostname;
  } catch (e) {
    return null;
  }
}

// --- MASTER PRODUCT LIST ---
const PRODUCTS = [
  {
    name: "Shampoo",
    url: "https://www.livingearthbeauty.com/products/living-libations-seabuckthorn-shampoo?variant=34971412594854#moreInfo",
    price: 14.0,
    refillsPerYear: 4,
  },
  {
    name: "Conditioner",
    url: "https://www.livingearthbeauty.com/products/living-libations-shine-on-hair-conditioner?pr_prod_strat=jac&pr_rec_id=9d1e8e85e&pr_rec_pid=5417488482470&pr_ref_pid=5417488384166&pr_seq=uniform",
    price: 14.0,
    refillsPerYear: 4,
  },
  {
    name: "Bar Shampoo",
    url: "https://www.livingearthbeauty.com/products/agave-nectar-aloe-organic-shampoo-bar?_pos=1&_sid=3db9a46ef&_ss=r",
    price: 10.0,
    refillsPerYear: 4,
  },
  {
    name: "Bar Conditioner",
    url: "https://www.livingearthbeauty.com/products/morrocco-method-citrus-silk-conditioner-bar?_pos=4&_sid=9c3cde1bb&_ss=r",
    price: 25.8,
    refillsPerYear: 4,
  },
  {
    name: "Bar Body Wash",
    url: "https://www.avodahrogah.com",
    price: 12.95,
    refillsPerYear: 4,
  },
  {
    name: "Body Wash (liquid)",
    url: "https://www.livingearthbeauty.com/search?q=body+scrub",
    price: 0.0,
    refillsPerYear: 4,
  },
  {
    name: "Body Oil",
    url: "https://www.livingearthbeauty.com/search?q=body+oil",
    price: 14.0,
    refillsPerYear: 4,
  },
  {
    name: "Shaving Cream",
    url: "https://mountainroseherbs.com/clean-shave-soap",
    price: 11.95,
    refillsPerYear: 4,
  },
  {
    name: "After Shave",
    url: "https://mountainroseherbs.com/after-shave",
    price: 11.95,
    refillsPerYear: 4,
  },
  {
    name: "Facial Cleanser",
    url: "https://mountainroseherbs.com/buttercream-cleansing-face-wash OR https://mountainroseherbs.com/marshmallow-cloud-facial-cleanser",
    price: 15.0,
    refillsPerYear: 4,
  },
  {
    name: "Toothpaste",
    url: "https://www.livingearthbeauty.com/products/living-libations-neem-enamelizer-toothpaste?_pos=1&_sid=f5b2b449b&_ss=r",
    price: 17.0,
    refillsPerYear: 4,
  },
  {
    name: "Shower Curtain",
    url: "https://beanproducts.com/products/cotton-shower-curtain",
    price: 39.95,
    refillsPerYear: 1,
  },
  {
    name: "Hand Soap",
    url: "https://meliorameansbetter.com/products/foaming-hand-soap-refill-tablets?variant=40539792769139",
    price: 10.99,
    refillsPerYear: 4,
  },
  {
    name: "Toilet Paper",
    url: "https://plantpaper.us/pages/plant-paper",
    price: 69.0,
    refillsPerYear: 4,
  },
  {
    name: "Tampons",
    url: "https://tampontribe.com/products/tampons?selling_plan=626000030&variant=44206457192706",
    price: 10.6,
    refillsPerYear: 12,
  },
  {
    name: "Toilet Cleaner",
    url: "https://meliorameansbetter.com/products/all-purpose-home-cleaner-spray-bottle-kit?variant=42172609429619",
    price: 15.99,
    refillsPerYear: 2,
  },
  {
    name: "Glass Cleaner",
    url: "https://meliorameansbetter.com/products/all-purpose-home-cleaner-spray-bottle-kit?variant=42172609429619",
    price: 15.99,
    refillsPerYear: 2,
  },
  {
    name: "All Purpose Cleaner",
    url: "https://meliorameansbetter.com/products/all-purpose-home-cleaner-spray-bottle-kit?variant=42172609429619",
    price: 15.99,
    refillsPerYear: 2,
  },
  {
    name: "Bleach Alternative",
    url: "https://meliorameansbetter.com/products/oxygen-brightener-bleach-alternative-booster?variant=41059620356211",
    price: 19.99,
    refillsPerYear: 2,
  },
  {
    name: "Rust/Lime Remover",
    url: "",
    price: 0.0,
    refillsPerYear: 0,
  },
  {
    name: "Epsom Salt",
    url: "https://mountainroseherbs.com/epsom-salt",
    price: 5.0,
    refillsPerYear: 2,
  },
  {
    name: "Floss",
    url: "https://www.livingearthbeauty.com/products/drtungs-smart-floss-paperboard?_pos=1&_sid=050196193&_ss=r",
    price: 8.0,
    refillsPerYear: 4,
  },
];

// Decide how many "variants" (different formulas) we need for hair/body items
function getVariantMultiplier(productName, flags) {
  const lower = productName.toLowerCase();
  const isHairOrBody =
    lower.includes("shampoo") ||
    lower.includes("conditioner") ||
    lower.includes("body wash");

  if (!isHairOrBody) return 1;

  let count = 0;
  if (flags.hasWomen) count++;
  if (flags.hasMen) count++;
  if (flags.hasKids) count++;

  // At least 1 if the product is included at all
  return count > 0 ? count : 1;
}

// --- MAIN ENDPOINT ---
app.get("/plan", (req, res) => {
  try {
    const quiz = req.query || {};
    const topConcerns = quiz.topConcerns || "";
    const wontUseRaw = quiz.wontUse || "";
    const wantToAdd = quiz.wantToAdd || "";

    const females13 = parseInt(quiz.females_13_plus || "0", 10) || 0;
    const males13 = parseInt(quiz.males_13_plus || "0", 10) || 0;
    const kids012 = parseInt(quiz.kids_0_12 || "0", 10) || 0;
    const householdSize = females13 + males13 + kids012;

    const hasWomen = females13 > 0;
    const hasMen = males13 > 0;
    const hasKids = kids012 > 0;

    // normalize "won't use" list
    const wontUseList = wontUseRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s.toLowerCase());

    // filter products based on "won't use"
    const includedProducts = PRODUCTS.filter((p) => {
      return !wontUseList.includes(p.name.toLowerCase());
    });

    let yearlySubtotal = 0;
    let firstMonthSubtotal = 0;

    const firstMonthProducts = [];
    const restYearProducts = [];

    // For shipping: store -> max shipments/year among its products
    const storeShipments = {};

    includedProducts.forEach((p) => {
      const price = p.price || 0;
      const refillsPerYear = p.refillsPerYear || 0; // includes initial month
      if (refillsPerYear <= 0) return; // nothing shipping

      const variantMultiplier = getVariantMultiplier(p.name, {
        hasWomen,
        hasMen,
        hasKids,
      });

      // shipments/year already includes initial
      const shipmentsPerYear = refillsPerYear;
      const remainingShipments = Math.max(shipmentsPerYear - 1, 0);

      // Month 1: one unit per variant
      const initialQty = variantMultiplier;
      const initialCost = round2(initialQty * price);

      // Remaining shipments: each shipment sends one unit per variant
      const refillsCost = round2(remainingShipments * price * variantMultiplier);

      const totalYearCost = round2(initialCost + refillsCost);

      yearlySubtotal += totalYearCost;
      firstMonthSubtotal += initialCost;

      firstMonthProducts.push({
        name: p.name,
        unit_price: price,
        quantity: initialQty,
        line_total: initialCost,
        url: p.url,
      });

            const shipmentsPerYear = refillsPerYear; // includes initial month
      const shipmentIntervalMonths =
        shipmentsPerYear > 0 ? 12 / shipmentsPerYear : null;

      restYearProducts.push({
        name: p.name,
        unit_price: price,
        shipments_per_year: shipmentsPerYear,        // how many shipments per year (incl. month 1)
        shipment_interval_months: shipmentIntervalMonths, // 12 / shipments_per_year
        shipments_remaining: remainingShipments,     // months 2–12 shipments
        refills_per_year: remainingShipments * variantMultiplier, // units in months 2–12
        cost_rest_of_year: refillsCost,
        total_cost_year: totalYearCost,
      });

      // shipping grouping by store
      const storeKey = getStoreKey(p.url);
      if (storeKey) {
        const prev = storeShipments[storeKey] || 0;
        // store shipping frequency = max shipments/year for that store
        storeShipments[storeKey] = Math.max(prev, shipmentsPerYear);
      }
    });

    yearlySubtotal = round2(yearlySubtotal);
    firstMonthSubtotal = round2(firstMonthSubtotal);

    // Shipping: $8 per shipment per store
    let shippingYearTotal = 0;
    Object.keys(storeShipments).forEach((key) => {
      shippingYearTotal += storeShipments[key] * SHIPPING_PER_SHIPMENT;
    });
    shippingYearTotal = round2(shippingYearTotal);

    const yearTax = round2(yearlySubtotal * TAX_RATE);
    const yearProductsPlusTax = round2(yearlySubtotal + yearTax);
    const yearGrandTotal = round2(yearProductsPlusTax + shippingYearTotal);

    const firstMonthTax = round2(firstMonthSubtotal * TAX_RATE);
    const firstMonthTotal = round2(firstMonthSubtotal + firstMonthTax);

    // shipping for month 1 = one shipment per store that has any product
    const storesCountMonth1 = Object.keys(storeShipments).length;
    const firstMonthShipping = round2(storesCountMonth1 * SHIPPING_PER_SHIPMENT);
    const restYearShipping = round2(shippingYearTotal - firstMonthShipping);

    const restYearSubtotal = round2(yearlySubtotal - firstMonthSubtotal);
    const restYearTax = round2(restYearSubtotal * TAX_RATE);
    const restYearTotal = round2(restYearSubtotal + restYearTax);

    const avgMonthRest = restYearTotal > 0 ? round2(restYearTotal / 11) : 0; // months 2–12

    const yearTotals = {
      products_subtotal: yearlySubtotal,
      tax_7_percent: yearTax,
      shipping_estimate: shippingYearTotal,
      grand_total: yearGrandTotal,
    };

    const restOfYear = {
      products_subtotal: restYearSubtotal,
      tax_7_percent: restYearTax,
      total_with_tax: restYearTotal,
      average_monthly_cost_months_2_to_12: avgMonthRest,
      shipping_estimate: restYearShipping,
      products: restYearProducts,
    };

    const schedule = [
      {
        label: "Month 1 – Initial Replacement",
        estimated_total_with_tax: firstMonthTotal,
        estimated_shipping: firstMonthShipping,
      },
      {
        label: "Average Months 2–12",
        estimated_monthly_cost: avgMonthRest,
      },
    ];

    // Build human summary
    let parts = [];

    if (householdSize > 0) {
      let compPieces = [];
      if (females13) compPieces.push(`${females13} female(s) 13+`);
      if (males13) compPieces.push(`${males13} male(s) 13+`);
      if (kids012) compPieces.push(`${kids012} kid(s) 0–12`);
      const compText = compPieces.length ? compPieces.join(", ") : `${householdSize} people`;

      parts.push(
        `For your household (${compText}), we planned a full year of this bath & body category using separate formulas for women, men, and kids where needed (like shampoo, conditioner, and body wash).`
      );
    } else {
      parts.push(
        `We planned a full year of this bath & body category using separate formulas for different age groups where needed (like shampoo, conditioner, and body wash).`
      );
    }

    parts.push(
      `The estimated total for a year is about $${yearGrandTotal.toFixed(
        2
      )} (products + 7% tax + about $${shippingYearTotal.toFixed(
        2
      )} in shipping, assuming roughly $${SHIPPING_PER_SHIPMENT.toFixed(
        2
      )} per shipment per store based on your refill schedule).`
    );

    if (firstMonthTotal > 0) {
      parts.push(
        `Month 1 products are about $${firstMonthTotal.toFixed(
          2
        )} (before shipping) as we replace everything once.`
      );
    }
    if (avgMonthRest > 0) {
      parts.push(
        `Months 2–12 then average around $${avgMonthRest.toFixed(
          2
        )} per month in products and tax as you move onto a refill schedule.`
      );
    }

    if (topConcerns) {
      parts.push(`We kept your top concerns in mind: ${topConcerns}.`);
    }
    if (wantToAdd) {
      parts.push(
        `You also asked for items not on this list. We’ll review those manually and see what we can source for you: ${wantToAdd}.`
      );
    }

    const summary = parts.join(" ");

    const response = {
      summary,
      year_totals: yearTotals,
      first_month: {
        products: firstMonthProducts,
        subtotal: firstMonthSubtotal,
        tax_7_percent: firstMonthTax,
        total_with_tax: firstMonthTotal,
        shipping_estimate: firstMonthShipping,
      },
      rest_of_year: restOfYear,
      schedule,
      meta: {
        householdSize,
        females_13_plus: females13,
        males_13_plus: males13,
        kids_0_12: kids012,
        wontUse: wontUseList,
        wantToAdd,
        store_shipments: storeShipments,
      },
    };

    res.setHeader("Content-Type", "application/json");
    res.json(response);
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ error: "Backend failure" });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Healthy Home Backend running on port " + PORT);
});
