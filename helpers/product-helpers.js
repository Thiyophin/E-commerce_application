var db = require('../config/connection')
var collection = require('../config/collections')
const { PRODUCT_COLLECTION } = require('../config/collections')
const { resolve, reject } = require('promise')
const { response } = require('express')
const { ObjectID } = require('mongodb')
var objectId = require('mongodb').ObjectId
module.exports ={
    addProduct:(product,callback)=>{
        db.get().collection('product').insertOne(product).then((data)=>{
            
        callback(data.ops[0]._id)
        })
    },getAllProduct:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },deleteProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).removeOne({_id:objectId(proId)}).then((response)=>{            
                resolve(response)
            })
        })
    },getProductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectID(proId)}).then((response)=>{
                resolve(response)
            })
        })
    },updateDetails:(proId,proDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id:objectId(proId)},{
                $set:{
                   Name:proDetails.Name,
                   Category:proDetails.Category,
                   Description:proDetails.Description,
                   Price:proDetails.Price
                }
            }).then((response)=>{
                resolve()
            })
        })
    }
}