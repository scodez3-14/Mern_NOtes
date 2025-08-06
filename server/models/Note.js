const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [1, 'Title cannot be empty'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    minlength: [1, 'Content cannot be empty'],
    maxlength: [10000, 'Content cannot exceed 10,000 characters']
  },
  category: {
    type: String,
    required: true,
    enum: ['personal', 'work', 'creative', 'study'],
    default: 'personal'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#ffffff',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, category: 1 });
noteSchema.index({ userId: 1, isPinned: -1, createdAt: -1 });
noteSchema.index({ 
  title: 'text', 
  content: 'text', 
  tags: 'text' 
}, {
  weights: {
    title: 10,
    content: 5,
    tags: 8
  }
});

// Update updatedAt field before saving
noteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to add tag
noteSchema.methods.addTag = function(tag) {
  if (tag && !this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this;
};

// Instance method to remove tag
noteSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this;
};

// Static method to find user's notes
noteSchema.statics.findUserNotes = function(userId, options = {}) {
  const {
    category,
    isPinned,
    isArchived = false,
    search,
    limit = 50,
    skip = 0,
    sortBy = 'updatedAt',
    sortOrder = -1
  } = options;
  
  let query = { userId, isArchived };
  
  if (category) query.category = category;
  if (typeof isPinned === 'boolean') query.isPinned = isPinned;
  if (search) {
    query.$text = { $search: search };
  }
  
  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .skip(skip);
};

// Static method to get user's note statistics
noteSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), isArchived: false } },
    {
      $group: {
        _id: null,
        totalNotes: { $sum: 1 },
        pinnedNotes: {
          $sum: { $cond: [{ $eq: ['$isPinned', true] }, 1, 0] }
        },
        categoryCounts: {
          $push: '$category'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalNotes: 1,
        pinnedNotes: 1,
        categories: {
          personal: {
            $size: {
              $filter: {
                input: '$categoryCounts',
                cond: { $eq: ['$$this', 'personal'] }
              }
            }
          },
          work: {
            $size: {
              $filter: {
                input: '$categoryCounts',
                cond: { $eq: ['$$this', 'work'] }
              }
            }
          },
          creative: {
            $size: {
              $filter: {
                input: '$categoryCounts',
                cond: { $eq: ['$$this', 'creative'] }
              }
            }
          },
          study: {
            $size: {
              $filter: {
                input: '$categoryCounts',
                cond: { $eq: ['$$this', 'study'] }
              }
            }
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Note', noteSchema);
