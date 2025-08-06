const express = require('express');
const { body, query, param } = require('express-validator');
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const handleValidationErrors = require('../middleware/validation');

const router = express.Router();

// Validation rules
const createNoteValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10,000 characters'),
  body('category')
    .isIn(['personal', 'work', 'creative', 'study'])
    .withMessage('Category must be one of: personal, work, creative, study'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Cannot have more than 10 tags');
      }
      return true;
    }),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Each tag must be 30 characters or less'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color code')
];

const updateNoteValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10,000 characters'),
  body('category')
    .optional()
    .isIn(['personal', 'work', 'creative', 'study'])
    .withMessage('Category must be one of: personal, work, creative, study'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Cannot have more than 10 tags');
      }
      return true;
    }),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Each tag must be 30 characters or less'),
  body('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned must be a boolean'),
  body('isArchived')
    .optional()
    .isBoolean()
    .withMessage('isArchived must be a boolean'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color code')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('category')
    .optional()
    .isIn(['personal', 'work', 'creative', 'study'])
    .withMessage('Category must be one of: personal, work, creative, study'),
  query('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned must be a boolean'),
  query('isArchived')
    .optional()
    .isBoolean()
    .withMessage('isArchived must be a boolean'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'title'])
    .withMessage('sortBy must be one of: createdAt, updatedAt, title'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be either asc or desc')
];

const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid note ID format')
];

// @route   GET /api/notes
// @desc    Get user's notes with pagination and filtering
// @access  Private
router.get('/', auth, queryValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      isPinned,
      isArchived = 'false',
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    
    const options = {
      category,
      isPinned: isPinned !== undefined ? isPinned === 'true' : undefined,
      isArchived: isArchived === 'true',
      search,
      limit: parseInt(limit),
      skip,
      sortBy,
      sortOrder: sortDirection
    };
    
    const notes = await Note.findUserNotes(req.user._id, options);
    
    // Get total count for pagination
    let countQuery = { userId: req.user._id, isArchived: isArchived === 'true' };
    if (category) countQuery.category = category;
    if (isPinned !== undefined) countQuery.isPinned = isPinned === 'true';
    if (search) countQuery.$text = { $search: search };
    
    const totalNotes = await Note.countDocuments(countQuery);
    const totalPages = Math.ceil(totalNotes / parseInt(limit));
    
    res.json({
      message: 'Notes retrieved successfully',
      data: {
        notes,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalNotes,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      error: 'Failed to retrieve notes',
      message: 'Unable to fetch notes. Please try again.'
    });
  }
});

// @route   GET /api/notes/stats
// @desc    Get user's note statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Note.getUserStats(req.user._id);
    
    res.json({
      message: 'Statistics retrieved successfully',
      data: stats[0] || {
        totalNotes: 0,
        pinnedNotes: 0,
        categories: {
          personal: 0,
          work: 0,
          creative: 0,
          study: 0
        }
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      message: 'Unable to fetch statistics. Please try again.'
    });
  }
});

// @route   GET /api/notes/:id
// @desc    Get a specific note by ID
// @access  Private
router.get('/:id', auth, idValidation, handleValidationErrors, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        message: 'The requested note does not exist or you do not have permission to view it.'
      });
    }
    
    res.json({
      message: 'Note retrieved successfully',
      data: note
    });
    
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      error: 'Failed to retrieve note',
      message: 'Unable to fetch note. Please try again.'
    });
  }
});

// @route   POST /api/notes
// @desc    Create a new note
// @access  Private
router.post('/', auth, createNoteValidation, handleValidationErrors, async (req, res) => {
  try {
    const { title, content, category, tags, color } = req.body;
    
    const note = new Note({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags ? tags.map(tag => tag.trim()).filter(tag => tag) : [],
      color,
      userId: req.user._id
    });
    
    await note.save();
    
    res.status(201).json({
      message: 'Note created successfully',
      data: note
    });
    
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      error: 'Failed to create note',
      message: 'Unable to create note. Please try again.'
    });
  }
});

// @route   PUT /api/notes/:id
// @desc    Update a note
// @access  Private
router.put('/:id', auth, idValidation, updateNoteValidation, handleValidationErrors, async (req, res) => {
  try {
    const { title, content, category, tags, isPinned, isArchived, color } = req.body;
    
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        message: 'The requested note does not exist or you do not have permission to update it.'
      });
    }
    
    // Update fields if provided
    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content.trim();
    if (category !== undefined) note.category = category;
    if (tags !== undefined) note.tags = tags.map(tag => tag.trim()).filter(tag => tag);
    if (isPinned !== undefined) note.isPinned = isPinned;
    if (isArchived !== undefined) note.isArchived = isArchived;
    if (color !== undefined) note.color = color;
    
    await note.save();
    
    res.json({
      message: 'Note updated successfully',
      data: note
    });
    
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      error: 'Failed to update note',
      message: 'Unable to update note. Please try again.'
    });
  }
});

// @route   DELETE /api/notes/:id
// @desc    Delete a note
// @access  Private
router.delete('/:id', auth, idValidation, handleValidationErrors, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        message: 'The requested note does not exist or you do not have permission to delete it.'
      });
    }
    
    res.json({
      message: 'Note deleted successfully',
      data: { id: note._id }
    });
    
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      error: 'Failed to delete note',
      message: 'Unable to delete note. Please try again.'
    });
  }
});

// @route   POST /api/notes/:id/pin
// @desc    Toggle pin status of a note
// @access  Private
router.post('/:id/pin', auth, idValidation, handleValidationErrors, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        message: 'The requested note does not exist or you do not have permission to modify it.'
      });
    }
    
    note.isPinned = !note.isPinned;
    await note.save();
    
    res.json({
      message: `Note ${note.isPinned ? 'pinned' : 'unpinned'} successfully`,
      data: { id: note._id, isPinned: note.isPinned }
    });
    
  } catch (error) {
    console.error('Pin note error:', error);
    res.status(500).json({
      error: 'Failed to pin/unpin note',
      message: 'Unable to modify note. Please try again.'
    });
  }
});

// @route   POST /api/notes/:id/archive
// @desc    Toggle archive status of a note
// @access  Private
router.post('/:id/archive', auth, idValidation, handleValidationErrors, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        message: 'The requested note does not exist or you do not have permission to modify it.'
      });
    }
    
    note.isArchived = !note.isArchived;
    await note.save();
    
    res.json({
      message: `Note ${note.isArchived ? 'archived' : 'unarchived'} successfully`,
      data: { id: note._id, isArchived: note.isArchived }
    });
    
  } catch (error) {
    console.error('Archive note error:', error);
    res.status(500).json({
      error: 'Failed to archive/unarchive note',
      message: 'Unable to modify note. Please try again.'
    });
  }
});

module.exports = router;
