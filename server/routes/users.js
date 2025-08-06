const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');

const router = express.Router();

// Validation rules
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      message: 'Profile retrieved successfully',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        fullName: user.getFullName(),
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to retrieve profile',
      message: 'Unable to fetch profile data. Please try again.'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, updateProfileValidation, handleValidationErrors, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const user = req.user;
    
    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          error: 'Email already exists',
          message: 'An account with this email address already exists.'
        });
      }
    }
    
    // Update fields if provided
    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (email) user.email = email.toLowerCase().trim();
    
    await user.save();
    
    res.json({
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        fullName: user.getFullName(),
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'Unable to update profile. Please try again.'
    });
  }
});

// @route   POST /api/users/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', auth, changePasswordValidation, handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password for comparison
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Invalid current password',
        message: 'The current password you entered is incorrect.'
      });
    }
    
    // Check if new password is the same as current password
    const isSamePassword = await user.comparePassword(newPassword);
    
    if (isSamePassword) {
      return res.status(400).json({
        error: 'Same password',
        message: 'New password must be different from your current password.'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: 'Unable to change password. Please try again.'
    });
  }
});

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user statistics
    const stats = await Note.getUserStats(userId);
    const userStats = stats[0] || {
      totalNotes: 0,
      pinnedNotes: 0,
      categories: {
        personal: 0,
        work: 0,
        creative: 0,
        study: 0
      }
    };
    
    // Get recent notes (last 5)
    const recentNotes = await Note.find({
      userId,
      isArchived: false
    })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('title content category updatedAt');
    
    // Get pinned notes
    const pinnedNotes = await Note.find({
      userId,
      isPinned: true,
      isArchived: false
    })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('title content category updatedAt');
    
    // Get today's activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayActivity = await Note.countDocuments({
      userId,
      updatedAt: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    res.json({
      message: 'Dashboard data retrieved successfully',
      data: {
        user: {
          id: req.user._id,
          fullName: req.user.getFullName(),
          email: req.user.email,
          lastLogin: req.user.lastLogin
        },
        statistics: {
          ...userStats,
          todayActivity
        },
        recentNotes,
        pinnedNotes
      }
    });
    
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      error: 'Failed to retrieve dashboard data',
      message: 'Unable to fetch dashboard data. Please try again.'
    });
  }
});

// @route   DELETE /api/users/account
// @desc    Deactivate user account
// @access  Private
router.delete('/account', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Deactivate account instead of deleting
    user.isActive = false;
    await user.save();
    
    res.json({
      message: 'Account deactivated successfully',
      data: {
        message: 'Your account has been deactivated. Contact support to reactivate.'
      }
    });
    
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      error: 'Failed to deactivate account',
      message: 'Unable to deactivate account. Please try again.'
    });
  }
});

module.exports = router;
