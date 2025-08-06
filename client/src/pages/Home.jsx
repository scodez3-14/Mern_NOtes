import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { notesAPI } from "../services/api";
import "./Home.css";

function Home() {
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNote, setSelectedNote] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", content: "", category: "personal" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { user, logout } = useAuth();

  // Load notes from API
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await notesAPI.getAllNotes();
      setNotes(response.data.data.notes || []);
    } catch (error) {
      console.error("Error loading notes:", error);
      if (error.code === 'ECONNREFUSED') {
        setError("Unable to connect to server. Please make sure the server is running.");
      } else {
        setError("Failed to load notes. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateNote = async () => {
    if (newNote.title.trim() && newNote.content.trim()) {
      try {
        const response = await notesAPI.createNote({
          title: newNote.title.trim(),
          content: newNote.content.trim(),
          category: newNote.category
        });
        
        const createdNote = response.data.data;
        setNotes(prev => [createdNote, ...prev]);
        setNewNote({ title: "", content: "", category: "personal" });
        setIsCreating(false);
        setSelectedNote(createdNote);
      } catch (error) {
        console.error("Error creating note:", error);
        setError("Failed to create note. Please try again.");
      }
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await notesAPI.deleteNote(noteId);
      setNotes(prev => prev.filter(note => note._id !== noteId));
      if (selectedNote && selectedNote._id === noteId) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      setError("Failed to delete note. Please try again.");
    }
  };

  const handleUpdateNote = async (noteId, updatedNote) => {
    try {
      const response = await notesAPI.updateNote(noteId, updatedNote);
      const updated = response.data.data;
      setNotes(prev => prev.map(note => 
        note._id === noteId ? updated : note
      ));
      if (selectedNote && selectedNote._id === noteId) {
        setSelectedNote(updated);
      }
    } catch (error) {
      console.error("Error updating note:", error);
      setError("Failed to update note. Please try again.");
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      work: "#3498db",
      personal: "#2ecc71",
      creative: "#e74c3c",
      study: "#f39c12"
    };
    return colors[category] || "#95a5a6";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="home-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>KeepNotes Dashboard</h1>
          <div className="header-actions">
            <div className="user-info">
              <span>Welcome, {user?.firstName || 'User'}!</span>
              <button 
                onClick={logout}
                className="logout-btn"
                title="Logout"
              >
                🚪 Logout
              </button>
            </div>
            <div className="search-container">
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
            <button 
              className="create-btn"
              onClick={() => setIsCreating(true)}
            >
              ✏️ New Note
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Error message */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your notes...</p>
          </div>
        ) : (
          <>
            {/* Sidebar with notes list */}
            <aside className="notes-sidebar">
              <div className="sidebar-header">
                <h3>Your Notes ({filteredNotes.length})</h3>
              </div>
              
              <div className="notes-list">
                {filteredNotes.length === 0 ? (
                  <div className="empty-state">
                    <p>{searchTerm ? "No notes found" : "No notes yet"}</p>
                    <button onClick={() => setIsCreating(true)}>
                      Create your first note
                    </button>
                  </div>
                ) : (
                  filteredNotes.map(note => (
                    <div
                      key={note._id}
                      className={`note-item ${selectedNote?._id === note._id ? 'active' : ''}`}
                      onClick={() => setSelectedNote(note)}
                    >
                      <div className="note-header">
                        <h4>{note.title}</h4>
                        <span 
                          className="category-badge"
                          style={{ backgroundColor: getCategoryColor(note.category) }}
                        >
                          {note.category}
                        </span>
                      </div>
                      <p className="note-preview">
                        {note.content.substring(0, 100)}
                        {note.content.length > 100 ? '...' : ''}
                      </p>
                      <div className="note-meta">
                        <span>{formatDate(note.updatedAt)}</span>
                        <button
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note._id);
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>

            {/* Main content area */}
            <main className="main-content">
              {isCreating ? (
                <div className="note-editor">
                  <div className="editor-header">
                    <h2>Create New Note</h2>
                    <div className="editor-actions">
                      <button
                        className="cancel-btn"
                        onClick={() => {
                          setIsCreating(false);
                          setNewNote({ title: "", content: "", category: "personal" });
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="save-btn"
                        onClick={handleCreateNote}
                        disabled={!newNote.title.trim() || !newNote.content.trim()}
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                  
                  <div className="editor-form">
                    <input
                      type="text"
                      placeholder="Note title..."
                      value={newNote.title}
                      onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                      className="title-input"
                    />
                    
                    <select
                      value={newNote.category}
                      onChange={(e) => setNewNote(prev => ({ ...prev, category: e.target.value }))}
                      className="category-select"
                    >
                      <option value="personal">Personal</option>
                      <option value="work">Work</option>
                      <option value="creative">Creative</option>
                      <option value="study">Study</option>
                    </select>
                    
                    <textarea
                      placeholder="Write your note here..."
                      value={newNote.content}
                      onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                      className="content-textarea"
                    />
                  </div>
                </div>
              ) : selectedNote ? (
                <div className="note-viewer">
                  <div className="viewer-header">
                    <div className="note-info">
                      <h2>{selectedNote.title}</h2>
                      <div className="note-metadata">
                        <span 
                          className="category-badge"
                          style={{ backgroundColor: getCategoryColor(selectedNote.category) }}
                        >
                          {selectedNote.category}
                        </span>
                        <span className="date-info">
                          Created: {formatDate(selectedNote.createdAt)}
                        </span>
                        <span className="date-info">
                          Updated: {formatDate(selectedNote.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="edit-btn"
                      onClick={() => {
                        // TODO: Implement edit functionality
                        alert("Edit functionality coming soon!");
                      }}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                  
                  <div className="note-content">
                    <p>{selectedNote.content}</p>
                  </div>
                </div>
              ) : (
                <div className="welcome-screen">
                  <div className="welcome-content">
                    <h2>Welcome to KeepNotes! 📝</h2>
                    <p>Select a note from the sidebar to view it, or create a new note to get started.</p>
                    <div className="stats">
                      <div className="stat">
                        <strong>{notes.length}</strong>
                        <span>Total Notes</span>
                      </div>
                      <div className="stat">
                        <strong>{new Set(notes.map(n => n.category)).size}</strong>
                        <span>Categories</span>
                      </div>
                      <div className="stat">
                        <strong>{notes.filter(n => {
                          const today = new Date();
                          const noteDate = new Date(n.updatedAt);
                          return noteDate.toDateString() === today.toDateString();
                        }).length}</strong>
                        <span>Today</span>
                      </div>
                    </div>
                    <button 
                      className="cta-button"
                      onClick={() => setIsCreating(true)}
                    >
                      Create Your First Note
                    </button>
                  </div>
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}

export default Home;
