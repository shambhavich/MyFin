import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2,
  Save,
  X,
  Filter, 
  ArrowUpDown, 
  Search, 
  IndianRupee, 
  Calendar as CalendarIcon,
  Tag,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt?: any;
  duplicated?: boolean;
}

const CATEGORIES = ['Food', 'Transport', 'Rent', 'Shopping', 'Utilities', 'Others'];

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [idempotencyKey, setIdempotencyKey] = useState(uuidv4());

  // Filter & Sort state
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc'>('date_desc');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/expenses', window.location.origin);
      if (filterCategory !== 'All') url.searchParams.append('category', filterCategory);
      url.searchParams.append('sort', sortBy);

      const res = await fetch(url.toString());
      const contentType = res.headers.get('content-type');

      if (!res.ok) {
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          console.error('API Error Details:', errorData);
          throw new Error(errorData.details || errorData.error || 'Failed to fetch expenses');
        } else {
          const text = await res.text();
          console.error('Non-JSON Error Response:', text);
          throw new Error(`Server error (${res.status}). Check if backend is running.`);
        }
      }

      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setExpenses(data);
        setError(null);
      } else {
        const text = await res.text();
        console.error('Unexpected Response Format:', text);
        throw new Error('Server returned HTML instead of JSON. The API route might be missing or misconfigured.');
      }
    } catch (err: any) {
      setError(err.message || 'Could not connect to the server. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filterCategory, sortBy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !date) return;
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selectedDate > today) {
      setError('Cannot record expenses for future dates');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          category,
          description,
          date,
          idempotencyKey,
          userId: 'user-123' // Mock user for now
        })
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to save expense');
        } else {
          const text = await res.text();
          console.error('Save error response:', text);
          throw new Error(`Server error (${res.status}) while saving.`);
        }
      }
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const newExpense = await res.json();
        
        // If it's a new one (not a duplicate response from retry)
        if (!newExpense.duplicated) {
          setExpenses(prev => {
            const updated = [newExpense, ...prev];
            // Re-sort if needed as the API might return it but we want to be safe
            return updated.sort((a, b) => {
              const dateA = new Date(a.date).getTime();
              const dateB = new Date(b.date).getTime();
              return sortBy === 'date_desc' ? dateB - dateA : dateA - dateB;
            });
          });
        }
      } else {
        throw new Error('Server returned invalid response format.');
      }

      // Reset form and generate new idempotency key for next entry
      setAmount('');
      setDescription('');
      setIdempotencyKey(uuidv4());
      setError(null);
    } catch (err) {
      setError('Failed to save expense. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE'
      });
      
      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to delete');
        } else {
          const text = await res.text();
          console.error('Delete error response:', text);
          throw new Error(`Server error (${res.status}) while deleting.`);
        }
      }
      
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense. Please try again.');
    }
  };

  const startEditing = (expense: Expense) => {
    setEditingId(expense.id);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.category);
    setEditDescription(expense.description);
    setEditDate(format(new Date(expense.date), 'yyyy-MM-dd'));
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    const selectedDate = new Date(editDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selectedDate > today) {
      setError('Cannot record expenses for future dates');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/expenses/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          category: editCategory,
          description: editDescription,
          date: editDate
        })
      });

      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update expense');
        } else {
          const text = await res.text();
          console.error('Update error response:', text);
          throw new Error(`Server error (${res.status}) while updating.`);
        }
      }

      if (contentType && contentType.includes('application/json')) {
        const updatedExpense = await res.json();
        setExpenses(prev => prev.map(exp => exp.id === editingId ? updatedExpense : exp));
        setEditingId(null);
        setError(null);
      } else {
        throw new Error('Server returned invalid response format.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update expense');
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 border-b border-slate-200">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-800">MyFin</h1>
            <p className="text-slate-500 mt-1">Track your spending, master your money.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 min-w-[200px]">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
              <IndianRupee size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Expenses</p>
              <p className="text-2xl font-bold text-slate-800">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </header>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="shrink-0" />
            <p>{error}</p>
            <button onClick={fetchExpenses} className="ml-auto underline text-sm font-medium">Retry</button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Section */}
          <section className="lg:col-span-5">
            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Plus size={20} className="text-blue-500" />
                Add New Expense
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600 ml-1">Amount (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600 ml-1">Category</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600 ml-1">Description</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                    <textarea
                      required
                      placeholder="What was it for?"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-h-[100px]"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600 ml-1">Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="date"
                      required
                      max={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-4"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={20} />
                      Record Expense
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>

          {/* List Section */}
          <section className="lg:col-span-7 space-y-6">
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                <Filter size={16} className="text-slate-400" />
                <select 
                  className="text-sm font-medium bg-transparent outline-none cursor-pointer"
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                <ArrowUpDown size={16} className="text-slate-400" />
                <select 
                  className="text-sm font-medium bg-transparent outline-none cursor-pointer"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {loading && expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <Loader2 className="animate-spin" size={40} />
                  <p>Loading your expenses...</p>
                </div>
              ) : expenses.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-20 px-10 text-center space-y-4">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Search className="text-slate-300" size={30} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700">No expenses found</h3>
                    <p className="text-slate-400 text-sm">Start by adding your first expense using the form.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 relative">
                  {loading && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-start justify-center pt-10 rounded-3xl">
                      <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                  )}
                  <AnimatePresence mode="popLayout">
                    {expenses.map((expense) => (
                      <motion.div
                        key={expense.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={cn(
                          "group bg-white p-4 rounded-2xl border transition-all",
                          editingId === expense.id ? "ring-2 ring-blue-500 border-blue-500" : "border-slate-100 hover:border-blue-200 hover:shadow-md"
                        )}
                      >
                        {editingId === expense.id ? (
                          <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Amount</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                  value={editAmount}
                                  onChange={e => setEditAmount(e.target.value)}
                                  autoFocus
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
                                <select
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                  value={editCategory}
                                  onChange={e => setEditCategory(e.target.value)}
                                >
                                  {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                value={editDescription}
                                onChange={e => setEditDescription(e.target.value)}
                              />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Date</label>
                                <input
                                  type="date"
                                  max={format(new Date(), 'yyyy-MM-dd')}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                  value={editDate}
                                  onChange={e => setEditDate(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                >
                                  <X size={16} /> Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={submitting}
                                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                                >
                                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                                  Save
                                </button>
                              </div>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                              expense.category === 'Food' ? "bg-orange-50 text-orange-500" :
                              expense.category === 'Transport' ? "bg-blue-50 text-blue-500" :
                              expense.category === 'Rent' ? "bg-purple-50 text-purple-500" :
                              expense.category === 'Shopping' ? "bg-pink-50 text-pink-500" :
                              expense.category === 'Utilities' ? "bg-yellow-50 text-yellow-500" :
                              "bg-slate-50 text-slate-500"
                            )}>
                              <Tag size={20} />
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-slate-800 truncate">{expense.description}</h3>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-900 ml-2 whitespace-nowrap">
                                    ₹{expense.amount.toLocaleString('en-IN')}
                                  </p>
                                  <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity ml-2">
                                    <button 
                                      onClick={() => startEditing(expense)}
                                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(expense.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs font-medium text-slate-400">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                                  {expense.category}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CalendarIcon size={12} />
                                  {format(new Date(expense.date), 'MMM d, yyyy')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      
      {/* Footer / Status Bar style attribution */}
      <footer className="max-w-4xl mx-auto mt-12 pt-8 border-t border-slate-200 flex justify-between items-center text-slate-400 text-xs">
        <p>© 2026 MyFin Expense Tracker</p>
        <p className="font-mono">Built for Resilience & Clarity</p>
      </footer>
    </div>
  );
}
