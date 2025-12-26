const Card = require('../models/Card');
const { normalizeIraqiPhone } = require('../utils/phoneUtils');

// توليد صيغ متعددة للرقم لتسهيل المطابقة (عراقي/تركي أو بدون +)
function getPhoneVariants(phone) {
  const digitsOnly = (phone || '').replace(/\D/g, '');
  const variants = new Set();
  if (!digitsOnly) return { canonical: '', variants: [] };

  // Canonical: الأرقام فقط
  variants.add(digitsOnly);

  // إذا كان يبدأ بـ964 أو 90، أضف نسخة مسبوقة بـ0 و+ أيضاً
  if (digitsOnly.startsWith('964')) {
    variants.add(`0${digitsOnly.slice(3)}`); // 07...
    variants.add(`+${digitsOnly}`);
  } else if (digitsOnly.startsWith('90')) {
    variants.add(`0${digitsOnly}`); // 0 + 90...
    variants.add(`+${digitsOnly}`);
  } else {
    // نسخة بـ0 في حال لم تبدأ بـ0
    if (!digitsOnly.startsWith('0')) {
      variants.add(`0${digitsOnly}`);
    }
  }

  return { canonical: digitsOnly, variants: Array.from(variants) };
}

// Get all cards
exports.getAllCards = async (req, res) => {
  try {
    const { isUsed } = req.query;
    const query = {};
    
    if (isUsed !== undefined) {
      query.isUsed = isUsed === 'true';
    }
    
    const cards = await Card.find(query).sort({ createdAt: -1 });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get card by code
exports.getCardByCode = async (req, res) => {
  try {
    const card = await Card.findOne({ code: req.params.code });
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create card
exports.createCard = async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || ![5000, 10000, 25000].includes(amount)) {
      return res.status(400).json({ error: 'Amount must be 5000, 10000, or 25000' });
    }
    
    // Generate unique code
    const code = generateCardCode();
    
    const card = new Card({
      code,
      amount,
    });
    
    await card.save();
    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Redeem card
exports.redeemCard = async (req, res) => {
  try {
    const { code, phone } = req.body;
    
    if (!code || !phone) {
      return res.status(400).json({ error: 'Code and phone are required' });
    }
    
    const { canonical } = getPhoneVariants(phone);
    const card = await Card.findOne({ code });
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    if (card.isUsed) {
      return res.status(400).json({ error: 'Card already used' });
    }
    
    card.isUsed = true;
    card.usedBy = canonical;
    card.usedAt = new Date();
    
    await card.save();
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// جلب البطاقات المستخدمة من قبل رقم هاتف
exports.getCardsByUserPhone = async (req, res) => {
  try {
    const phone = req.params.phone;
    const { variants } = getPhoneVariants(phone);

    if (!variants.length) {
      return res.status(400).json({ error: 'Phone is required' });
    }

    const cards = await Card.find({
      usedBy: { $in: variants },
      isUsed: true,
    }).sort({ usedAt: -1 });

    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate unique card code
function generateCardCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}



