import React, { useState } from "react";
import { useExpenses } from "../hooks/useExpenses";
import "./CategoryManager.css";

interface CategoryManagerProps {
  onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  onClose,
}) => {
  const { categories, categoryColors, addCategory, deleteCategory } =
    useExpenses();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#a8b5a0");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsAdding(true);
    try {
      const success = await addCategory(
        newCategoryName.trim(),
        newCategoryColor
      );
      if (success) {
        setNewCategoryName("");
        setNewCategoryColor("#a8b5a0");
      } else {
        alert("Failed to add category. It might already exist.");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Failed to add category");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (deleteConfirm !== categoryName) {
      setDeleteConfirm(categoryName);
      setTimeout(() => setDeleteConfirm(null), 3000); // Auto-cancel after 3 seconds
      return;
    }

    try {
      await deleteCategory(categoryName);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category");
    }
  };

  const defaultCategories = [
    "Food",
    "Transportation",
    "Shopping",
    "Entertainment",
  ];
  const customCategories = categories.filter(
    (cat) => !defaultCategories.includes(cat)
  );

  return (
    <div className="category-manager-overlay">
      <div className="category-manager">
        <div className="category-manager-header">
          <h3>Manage Your Categories</h3>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="category-manager-content">
          {/* Add New Category */}
          <div className="add-category-section">
            <h4>Add New Category</h4>
            <form onSubmit={handleAddCategory} className="add-category-form">
              <div className="form-row">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="category-name-input"
                  maxLength={50}
                />
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="category-color-input"
                />
                <button
                  type="submit"
                  disabled={isAdding || !newCategoryName.trim()}
                  className="add-button"
                >
                  {isAdding ? "..." : "Add"}
                </button>
              </div>
            </form>
          </div>

          {/* Default Categories */}
          <div className="categories-section">
            <h4>Default Categories</h4>
            <div className="categories-list">
              {defaultCategories.map((category) => (
                <div key={category} className="category-item default">
                  <div className="category-info">
                    <div
                      className="category-color-dot"
                      style={{
                        backgroundColor: categoryColors[category] || "#6b7280",
                      }}
                    />
                    <span className="category-name">{category}</span>
                  </div>
                  <span className="category-status">Default</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Categories */}
          {customCategories.length > 0 && (
            <div className="categories-section">
              <h4>Your Custom Categories</h4>
              <div className="categories-list">
                {customCategories.map((category) => (
                  <div key={category} className="category-item custom">
                    <div className="category-info">
                      <div
                        className="category-color-dot"
                        style={{
                          backgroundColor:
                            categoryColors[category] || "#6b7280",
                        }}
                      />
                      <span className="category-name">{category}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className={`delete-button ${
                        deleteConfirm === category ? "confirm" : ""
                      }`}
                    >
                      {deleteConfirm === category ? "Confirm Delete" : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customCategories.length === 0 && (
            <div className="no-custom-categories">
              <p>You haven't created any custom categories yet.</p>
              <p>Add one above to get started!</p>
            </div>
          )}
        </div>

        <div className="category-manager-footer">
          <div className="isolation-notice">
            <small>
              ℹ️ Your categories are private to you. Adding or deleting
              categories won't affect other users.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};
