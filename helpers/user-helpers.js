var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { USER_COLLECTION } = require('../config/collections')
const { resolve, reject } = require('promise')
const { ObjectID } = require('mongodb')
const { response } = require('express')
const { report } = require('../routes/user')
module.exports = {
    doSignUp: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.ops[0])
            })
        })
    }, doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log('Login success');
                        response.user = user
                        response.status = true
                        resolve(response)

                    } else {
                        console.log('Login failed');
                        resolve({ status: false })
                    }
                })
            } else {
                console.log('Login failed');
                resolve({ status: false })
            }
        })
    }, addToCart: (proId, userId) => {
        let proObj={
            item:ObjectID(proId),
            quantity:1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION)
                .findOne({ user: ObjectID(userId) })
            if (userCart) {
                let proExist=userCart.product.findIndex(product=> product.item==proId)
                console.log(proExist);
                if(proExist!=-1){
                  db.get().collection(collection.CART_COLLECTION)
                  .updateOne({user:ObjectID(userId),'product.item':ObjectID(proId)},
                  {
                      $inc:{'product.$.quantity':1}
                  }
                  ).then(()=>{
                      resolve()
                  })
                }else{
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ user: ObjectID(userId) }, {
                        $push: {
                            product:proObj
                        }
                    }).then((response) => {
                        resolve()
                    })
                }
            } else {
                let cartObj = {
                    user: ObjectID(userId),
                    product: [proObj]
                }

                db.get().collection(collection.CART_COLLECTION)
                    .insertOne(cartObj).then((response) => {
                        resolve()
                    })
            }
        })
    }, getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION)
                .aggregate([
                    {
                        $match: { user: ObjectID(userId) }
                    },
                     {
                         $unwind:'$product'
                     },{
                         $project:{
                             item:'$product.item',
                             quantity:'$product.quantity'
                         }
                     },
                     {
                         $lookup:{
                             from:collection.PRODUCT_COLLECTION,
                             localField:'item',
                             foreignField:'_id',
                             as:'product'
                         }
                     },{
                         $project:{
                             item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                         }
                     }
                ]).toArray()     
            resolve(cartItems)
        })
    },getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectID(userId)})
            if(cart){
                count=cart.product.length
            }resolve(count)
        })
    },changeProductQuantity:(details)=>{
        details.count=parseInt(details.count)
       details.quantity=parseInt(details.quantity)
        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
               db.get().collection(collection.CART_COLLECTION)
               .updateOne({_id:ObjectID(details.cart)},
               {
                   $pull:{product:{item:ObjectID(details.product)}}
               }).then((response)=>{
                   resolve({removeProduct:true})
               })
            }else{
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({_id:ObjectID(details.cart),'product.item':ObjectID(details.product)},
                {
                    $inc:{'product.$.quantity':details.count}
                }).then((response)=>{
                    resolve({status:true})
                })
            }
               
        })
    },removeProduct:(ids)=>{
        return new Promise((resolve,reject)=>{
          db.get().collection(collection.CART_COLLECTION)
          .updateOne({_id:ObjectID(ids.cart)},{
              $pull:{product:{item:ObjectID(ids.product)}}
          }).then((response)=>{
              resolve(true)
          })
        })
    },getTotalAmount:(userId)=>{
        
        return new Promise(async (resolve, reject) => {
            
            let total = await db.get().collection(collection.CART_COLLECTION)
                .aggregate([
                    {
                        $match: { user: ObjectID(userId) }
                    },
                     {
                         $unwind:'$product'
                     },{
                         $project:{
                             item:'$product.item',
                             quantity:'$product.quantity'
                         }
                     },
                     {
                         $lookup:{
                             from:collection.PRODUCT_COLLECTION,
                             localField:'item',
                             foreignField:'_id',
                             as:'product'
                         }
                     },{
                         $project:{
                             item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                         }
                     },{
                         $group:{
                             _id:null,
                             total:{$sum:{$multiply:['$quantity','$product.Price']}}
                         }
                     }
                ]).toArray() 
               // console.log(total[0].total);    
            resolve(total[0].total)
        })
    },placeOrder:(order,products,total)=>{
      return new Promise((resolve,reject)=>{
          let status=order['payment-method']==='COD'?'placed':'pending'
          let orderObj={
              deliveryDetails:{
                  mobile:order.mobile,
                  address:order.address,
                  pincode:order.pincode
              },
              userId:ObjectID(order.userId),
              paymentMethod:order['payment-method'],
              products:products,
              totalAmount:total,
              status:status,
              date:new Date()            
          }
          db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
             db.get().collection(collection.CART_COLLECTION).removeOne({user:ObjectID(order.userId)})
            resolve()
          })
     // console.log(order,total,products);
      })
    },getCartProductList:(userId)=>{
    return new Promise(async(resolve,reject)=>{
        let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectID(userId)})
     resolve(cart.product)
    })
    },getUserOrders:(userId)=>{
     return new Promise(async(resolve,reject)=>{
         //console.log(userId);
         let orders=await db.get().collection(collection.ORDER_COLLECTION)
         .find({userId:ObjectID(userId)}).toArray()
         //console.log(orders);
         resolve(orders)
     })
    },getOrderProducts:(orderId)=>{
        //console.log(orderID);
        return new Promise(async(resolve,reject)=>{
            let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id:ObjectID(orderId) }
                },
                 {
                     $unwind:'$product'
                 },{
                     $project:{
                         item:'$product.item',
                         quantity:'$product.quantity'
                     }
                 },
                 {
                     $lookup:{
                         from:collection.PRODUCT_COLLECTION,
                         localField:'item',
                         foreignField:'_id',
                         as:'product'
                     }
                 },{
                     $project:{
                         item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                     }
                 }
            ]).toArray()
           // console.log(orderItems);
            resolve(orderItems)
        })

    }
}