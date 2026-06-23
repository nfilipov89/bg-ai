const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const products = [
  {id:1,name:'Продукт 1',price:19.99},
  {id:2,name:'Продукт 2',price:29.99},
  {id:3,name:'Продукт 3',price:9.99}
];

app.get('/api/products', (req,res) => res.json(products));
app.get('/', (req,res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

module.exports = app;