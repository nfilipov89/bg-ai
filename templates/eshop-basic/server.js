const express=require('express');const app=express();app.use(express.json());app.use(express.static('public'));
const products=[{id:1,name:'Продукт 1',price:19.99},{id:2,name:'Продукт 2',price:29.99},{id:3,name:'Продукт 3',price:9.99}];
app.get('/api/products',(req,res)=>res.json(products));
app.listen(3000,()=>console.log('Eshop on http://localhost:3000'));