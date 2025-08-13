/**
 * Backend API Implementation Example for Referral System
 * This is a Node.js/Express example showing how to implement the referral system
 * endpoints that the mobile app expects.
 */

const express = require('express');
const router = express.Router();

// Mock database - in production, use a real database
let users = [];
let referralCodes = [];
let referrals = [];
let coupons = [];

// Generate random ID
const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * POST /referrals/register-code
 * Register a new referral code for a user
 */
router.post('/register-code', async (req, res) => {
  try {
    const { userId, referralCode } = req.body;

    // Check if referral code already exists
    const existingCode = referralCodes.find(code => code.referralCode === referralCode);
    if (existingCode) {
      return res.status(409).json({
        error: 'Referral code already exists',
        code: 'REFERRAL_CODE_EXISTS'
      });
    }

    // Create referral code entry
    const codeEntry = {
      id: generateId(),
      userId,
      referralCode,
      createdAt: new Date().toISOString(),
      totalClicks: 0,
      totalReferrals: 0,
      totalSuccessfulReferrals: 0
    };

    referralCodes.push(codeEntry);

    res.status(201).json({
      success: true,
      referralCode: codeEntry
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /referrals/apply
 * Apply a referral code when a new user registers
 */
router.post('/apply', async (req, res) => {
  try {
    const { referralCode, newUserId } = req.body;

    // Find the referral code
    const codeEntry = referralCodes.find(code => code.referralCode === referralCode);
    if (!codeEntry) {
      return res.status(404).json({
        error: 'Invalid referral code',
        code: 'INVALID_REFERRAL_CODE'
      });
    }

    // Check if user already used a referral code
    const existingReferral = referrals.find(ref => ref.referredUserId === newUserId);
    if (existingReferral) {
      return res.status(409).json({
        error: 'User already used a referral code',
        code: 'REFERRAL_ALREADY_USED'
      });
    }

    // Create referral entry
    const referral = {
      id: generateId(),
      referralCode,
      referrerUserId: codeEntry.userId,
      referredUserId: newUserId,
      status: 'pending', // pending, successful, expired
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    referrals.push(referral);

    // Update referral code stats
    codeEntry.totalReferrals++;

    // Create welcome coupons for both users
    const refereeCoupon = {
      id: generateId(),
      code: `WELCOME${generateId().toUpperCase().substring(0, 6)}`,
      type: 'referee',
      discount: 10, // 10% discount
      discountType: 'percentage',
      userId: newUserId,
      referralId: referral.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      isUsed: false,
      createdAt: new Date().toISOString()
    };

    const referrerCoupon = {
      id: generateId(),
      code: `REFERRAL${generateId().toUpperCase().substring(0, 6)}`,
      type: 'referrer',
      discount: 50, // R50 discount
      discountType: 'fixed',
      userId: codeEntry.userId,
      referralId: referral.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      isUsed: false,
      createdAt: new Date().toISOString()
    };

    coupons.push(refereeCoupon, referrerCoupon);

    res.status(200).json({
      success: true,
      rewards: {
        referee: refereeCoupon,
        referrer: referrerCoupon
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /referrals/stats/:userId
 * Get referral statistics for a user
 */
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user's referral code
    const userReferralCode = referralCodes.find(code => code.userId === parseInt(userId));
    if (!userReferralCode) {
      return res.status(404).json({
        error: 'Referral code not found',
        code: 'REFERRAL_CODE_NOT_FOUND'
      });
    }

    // Get user's referrals
    const userReferrals = referrals.filter(ref => ref.referrerUserId === parseInt(userId));
    const successfulReferrals = userReferrals.filter(ref => ref.status === 'successful');
    const pendingReferrals = userReferrals.filter(ref => ref.status === 'pending');

    // Get user's coupons
    const userCoupons = coupons.filter(coupon => coupon.userId === parseInt(userId));
    const availableCoupons = userCoupons.filter(coupon => !coupon.isUsed && new Date(coupon.expiresAt) > new Date());

    // Calculate total earnings
    const totalEarnings = availableCoupons.reduce((sum, coupon) => {
      if (coupon.discountType === 'fixed') {
        return sum + coupon.discount;
      } else {
        // For percentage discounts, estimate based on average order value
        return sum + (coupon.discount * 2); // Assuming R200 average order
      }
    }, 0);

    // Create referral history with user details (mock)
    const referralHistory = userReferrals.map(ref => ({
      ...ref,
      referredUserName: `User ${ref.referredUserId}`,
      referredUserEmail: `user${ref.referredUserId}@example.com`,
      reward: userCoupons.find(c => c.referralId === ref.id)
    }));

    const stats = {
      totalReferrals: userReferrals.length,
      successfulReferrals: successfulReferrals.length,
      pendingReferrals: pendingReferrals.length,
      totalEarnings,
      availableCoupons,
      referralHistory
    };

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /referrals/track-click
 * Track when a referral link is clicked
 */
router.post('/track-click', async (req, res) => {
  try {
    const { referralCode, source, timestamp } = req.body;

    // Find the referral code
    const codeEntry = referralCodes.find(code => code.referralCode === referralCode);
    if (!codeEntry) {
      return res.status(404).json({
        error: 'Invalid referral code',
        code: 'INVALID_REFERRAL_CODE'
      });
    }

    // Update click count
    codeEntry.totalClicks++;

    // You could also store individual click events for detailed analytics
    // clicks.push({ referralCode, source, timestamp, ip: req.ip });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /referrals/validate/:referralCode
 * Validate if a referral code exists and is active
 */
router.get('/validate/:referralCode', async (req, res) => {
  try {
    const { referralCode } = req.params;

    const codeEntry = referralCodes.find(code => code.referralCode === referralCode);
    if (!codeEntry) {
      return res.status(200).json({ valid: false });
    }

    // Get referrer details (mock)
    const referrer = {
      id: codeEntry.userId,
      name: `User ${codeEntry.userId}`,
      totalReferrals: codeEntry.totalReferrals
    };

    res.status(200).json({
      valid: true,
      referrer
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /referrals/coupons/:couponId/use
 * Use a referral coupon in an order
 */
router.post('/coupons/:couponId/use', async (req, res) => {
  try {
    const { couponId } = req.params;
    const { orderId } = req.body;

    // Find the coupon
    const coupon = coupons.find(c => c.id === couponId);
    if (!coupon) {
      return res.status(404).json({
        error: 'Coupon not found',
        code: 'COUPON_NOT_FOUND'
      });
    }

    // Check if coupon is already used
    if (coupon.isUsed) {
      return res.status(409).json({
        error: 'Coupon already used',
        code: 'COUPON_ALREADY_USED'
      });
    }

    // Check if coupon is expired
    if (new Date(coupon.expiresAt) < new Date()) {
      return res.status(409).json({
        error: 'Coupon expired',
        code: 'COUPON_EXPIRED'
      });
    }

    // Mark coupon as used
    coupon.isUsed = true;
    coupon.usedAt = new Date().toISOString();
    coupon.orderId = orderId;

    // If this is a referee's first purchase, mark referral as successful
    const referral = referrals.find(ref => ref.id === coupon.referralId);
    if (referral && referral.status === 'pending' && coupon.type === 'referee') {
      referral.status = 'successful';
      referral.completedAt = new Date().toISOString();

      // Update referral code stats
      const codeEntry = referralCodes.find(code => code.referralCode === referral.referralCode);
      if (codeEntry) {
        codeEntry.totalSuccessfulReferrals++;
      }
    }

    res.status(200).json({
      success: true,
      discount: coupon.discount
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /referrals/leaderboard
 * Get referral leaderboard (optional feature)
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = referralCodes
      .sort((a, b) => b.totalSuccessfulReferrals - a.totalSuccessfulReferrals)
      .slice(0, 10)
      .map((code, index) => ({
        rank: index + 1,
        userId: code.userId,
        userName: `User ${code.userId}`, // In production, join with users table
        referralCode: code.referralCode,
        totalReferrals: code.totalSuccessfulReferrals
      }));

    res.status(200).json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

/**
 * Usage in your main Express app:
 * 
 * const express = require('express');
 * const referralRoutes = require('./referralApi.example');
 * const app = express();
 * 
 * app.use(express.json());
 * app.use('/api/referrals', referralRoutes);
 * 
 * app.listen(3000, () => {
 *   console.log('Server running on port 3000');
 * });
 */

/**
 * Database Schema Examples:
 * 
 * -- Users table (existing)
 * CREATE TABLE users (
 *   id SERIAL PRIMARY KEY,
 *   first_name VARCHAR(100),
 *   last_name VARCHAR(100),
 *   email VARCHAR(255) UNIQUE,
 *   phone VARCHAR(20),
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 * 
 * -- Referral codes table
 * CREATE TABLE referral_codes (
 *   id SERIAL PRIMARY KEY,
 *   user_id INTEGER REFERENCES users(id),
 *   referral_code VARCHAR(20) UNIQUE NOT NULL,
 *   total_clicks INTEGER DEFAULT 0,
 *   total_referrals INTEGER DEFAULT 0,
 *   total_successful_referrals INTEGER DEFAULT 0,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 * 
 * -- Referrals table
 * CREATE TABLE referrals (
 *   id SERIAL PRIMARY KEY,
 *   referral_code VARCHAR(20) REFERENCES referral_codes(referral_code),
 *   referrer_user_id INTEGER REFERENCES users(id),
 *   referred_user_id INTEGER REFERENCES users(id),
 *   status VARCHAR(20) DEFAULT 'pending', -- pending, successful, expired
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   completed_at TIMESTAMP NULL
 * );
 * 
 * -- Referral coupons table
 * CREATE TABLE referral_coupons (
 *   id SERIAL PRIMARY KEY,
 *   code VARCHAR(50) UNIQUE NOT NULL,
 *   type VARCHAR(20) NOT NULL, -- referrer, referee
 *   discount DECIMAL(10,2) NOT NULL,
 *   discount_type VARCHAR(20) NOT NULL, -- percentage, fixed
 *   user_id INTEGER REFERENCES users(id),
 *   referral_id INTEGER REFERENCES referrals(id),
 *   expires_at TIMESTAMP NOT NULL,
 *   is_used BOOLEAN DEFAULT FALSE,
 *   used_at TIMESTAMP NULL,
 *   order_id INTEGER NULL,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 * 
 * -- Referral clicks table (for analytics)
 * CREATE TABLE referral_clicks (
 *   id SERIAL PRIMARY KEY,
 *   referral_code VARCHAR(20) REFERENCES referral_codes(referral_code),
 *   source VARCHAR(100),
 *   ip_address INET,
 *   user_agent TEXT,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */
