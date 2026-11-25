import express from 'express';
import { Product } from '../models/Product.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';
  const products = await Product.findAll();

  res.json(products.filter((product) => {
    const productCategory = (product.category || 'Other').toLowerCase();
    const categoryMatches = !category || productCategory === category;
    const searchMatches = !search
      || product.name.toLowerCase().includes(search)
      || productCategory.includes(search)
      || product.keywords.some((keyword) => keyword.toLowerCase().includes(search));

    return categoryMatches && searchMatches;
  }));
});

router.get('/categories', async (req, res) => {
  const products = await Product.unscoped().findAll({
    attributes: ['category'],
    raw: true
  });
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  res.json(categories);
});

router.get('/:productId', async (req, res) => {
  const product = await Product.findByPk(req.params.productId);

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  res.json(product);
});

export default router;