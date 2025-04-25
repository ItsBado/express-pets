const validate = require("validator")
const nodemailer = require("nodemailer")
const { ObjectId } = require("mongodb")
const sanitizeHtml = require("sanitize-html")
const petsCollection = require("../db").db().collection("pets")
const contactsCollection = require("../db").db().collection("contacts")

const sanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {}
}

exports.submitContact = async function (req, res, next) {
  if (req.body.secret.toUpperCase() !== "PUPPY") {
    console.log("Spam")
    return res.json({message:"Sorry"})
  }

  if (typeof req.body.name != "string") {
    req.body.name = "" /* storing in DB */
  }

  if (typeof req.body.email != "string") {
    req.body.email = "" /* storing in DB */
  }

  if (typeof req.body.comment != "string") {
    req.body.comment  = "" /* storing in DB */
  }

  if (!validate.isEmail(req.body.email)) {
    console.log("Invalid email")
    return res.json({message:"Sorry"})
  }

  if (!ObjectId.isValid(req.body.petId)) {
    console.log("Invalid Id")
    return res.json({message:"Sorry"})
  }

  req.body.petId = new ObjectId(req.body.petId)
  const doesPetExist = await petsCollection.findOne({_id: req.body.petId})

  if (!doesPetExist) {
    console.log("pet doesn't exist!")
    return res.json({message:"Sorry"})
  }

  const ourObject = {
    petId: req.body.petId,
    name: sanitizeHtml(req.body.name, sanitizeOptions),
    email: sanitizeHtml(req.body.email, sanitizeOptions),
    comment: sanitizeHtml(req.body.comment, sanitizeOptions)
  }

  console.log(ourObject)

  
  var transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: process.env.MAILTRAPUSERNAME,
      pass: process.env.MAILTRAPPASSWORD
    }
  })

  try {

    const promise1 = transport.sendMail({
      to: ourObject.email,
      from: "pedtadopation@localhost",
      subject: `Thank you for your interest in ${doesPetExist.name}`,
      html: `<h3 style="color: purple; font-size: 30px; font-weight: normal;">Thank you!</h3>
      <p>We appreciate your interest in ${doesPetExist.name} and one of our staff members will reach out to you shortly! Below is a copy of the message you sent us for your personal records:</p
      <p><em>${ourObject.comment}</em></p>`
    })
  
    const promise2 = transport.sendMail({
      to: "pedtadopation@localhost",
      from: "pedtadopation@localhost",
      subject: `Someone is interested in ${doesPetExist.name}`,
      html: `<h3 style="color: purple; font-size: 30px; font-weight: normal;">New contact!</h3>
      <p>Name: ${ourObject.name}<br>
      Pet Instersted In: ${doesPetExist.name}<br>
      Email: ${ourObject.email}<br>
      Message: ${ourObject.comment}<br>
      </p>`
    })

    const promise3 = await contactsCollection.insertOne(ourObject)

    await Promise.all([promise1, promise2, promise3])

  } catch(err) {
    next(err)
  }

  res.send("Thanks for sending data to us")

}

exports.viewPetContacts = async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    console.log("Invalid Id")
    return res.redircet("/")
  }

  const pet = await petsCollection.findOne({_id: new ObjectId(req.params.id)})

  if (!pet) {
    console.log("pet doesn't exist!")
    return res.redirect("/")
  }

  const contacts = await contactsCollection.find({petId: new ObjectId(req.params.id)}).toArray()
  res.render("pet-contacts", {contacts, pet})
}
