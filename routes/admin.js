const { response } = require('express');
var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');

/* GET users listing. */
router.get('/', function (req, res, next) {
  productHelpers.getAllProduct().then((product) => {
    
    res.render('admin/view-products', { admin: true, product })
  })

});
router.get('/add-product', function (req, res) {
  res.render('admin/add-product')
})
router.post('/add-product', (req, res) => {
  productHelpers.addProduct(req.body, (id) => {
    let image = req.files.Image
    image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
      if (!err) {
        res.render('admin/add-product')
      } else {
        console.log(err)
      }
    })
  })
})
router.get('/delete-product/:id',(req,res)=>{
  let proId = req.params.id
  console.log(proId)
 productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin/')
  }) 
})
router.get('/edit-product/:id',async(req,res)=>{
  let product =await productHelpers.getProductDetails(req.params.id)
  //console.log(product);
  res.render('admin/edit-product',{product})
})
router.post('/edit-product/:id',(req,res)=>{
  productHelpers.updateDetails(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.Image){
      let id = req.params.id
      let image = req.files.Image
    image.mv('./public/product-images/' + id + '.jpg')
    }
  })
})

module.exports = router;
