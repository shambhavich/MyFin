import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. API will fail until configured in Settings.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function startServer() {
  const server = express();
  const PORT = 3000;

  server.use(cors());
  server.use(express.json());

  // API Routes
  
  // GET /api/expenses
  server.get('/api/expenses', async (req, res) => {
    try {
      const { category, sort } = req.query;
      
      let query = supabase.from('expenses').select('*');

      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      if (sort === 'date_asc') {
        query = query.order('date', { ascending: true });
      } else {
        query = query.order('date', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      res.json(data);
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ error: 'Failed to fetch expenses', details: error.message });
    }
  });

  // POST /api/expenses
  server.post('/api/expenses', async (req, res) => {
    try {
      const { amount, category, description, date, idempotencyKey, userId } = req.body;

      if (!amount || !category || !description || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

       // Amount validation: Reject negative or zero amounts
      if (Number(amount) <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than zero' });
      }
      
      // Date validation
      const expenseDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (expenseDate > today) {
        return res.status(400).json({ error: 'Cannot record expenses for future dates' });
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          amount: Number(amount),
          category,
          description,
          date,
          userId: userId || 'anonymous',
          idempotencyKey: idempotencyKey || null
        }])
        .select()
        .single();

      if (error) {
        // Handle duplicate key error (idempotency)
        if (error.code === '23505') {
          const { data: existing } = await supabase
            .from('expenses')
            .select()
            .eq('idempotencyKey', idempotencyKey)
            .single();
          return res.json({ ...existing, duplicated: true });
        }
        throw error;
      }

      res.status(201).json(data);
    } catch (error: any) {
      console.error('Error creating expense:', error);
      res.status(500).json({ error: 'Failed to create expense', details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    server.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    server.use(express.static(distPath));
    server.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
