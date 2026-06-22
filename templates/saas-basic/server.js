const express=require('express');const app=express();app.use(express.urlencoded({extended:true}));app.use(express.static('public'));
app.post('/login',(req,res)=>res.redirect('/dashboard.html'));
app.listen(3000,()=>console.log('SaaS on http://localhost:3000'));