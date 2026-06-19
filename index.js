const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion } = require("mongodb");

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello Ticketix Server");
});

const uri = process.env.TICKETIX_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);
        const TicketCollection = db.collection("tickets");

        // Ticket Add
        app.post("/api/add-ticket", async (req, res) => {
            const {
                title,
                from,
                to,
                transportType,
                price,
                quantity,
                departureDate,
                perks,
                image,
                vendorName,
                vendorEmail,
                vendorId,
            } = req.body;

            if (
                !title ||
                !from ||
                !to ||
                !transportType ||
                !price ||
                !quantity ||
                !departureDate ||
                !vendorName ||
                !vendorEmail ||
                !vendorId
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required fields",
                });
            }

            if (Number(price) <= 0 || Number(quantity) <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Price and quantity must be greater than 0",
                });
            }

            if (new Date(departureDate) <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: "Departure date must be in the future",
                });
            }

            const validTransportTypes = ["Bus", "Train", "Plane", "Launch"];
            if (!validTransportTypes.includes(transportType)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid transport type",
                });
            }

            const finalData = {
                title: title.trim(),
                from: from.trim(),
                to: to.trim(),
                transportType,
                price: Number(price),
                quantity: Number(quantity),
                soldQuantity: 0,
                departureDate,
                perks: Array.isArray(perks) ? perks : [],
                image: image || "",
                vendorName: vendorName.trim(),
                vendorEmail: vendorEmail.trim().toLowerCase(),
                vendorId,
                verificationStatus: "pending",
                isAdvertised: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await TicketCollection.insertOne(finalData);
            console.log(finalData);
            res.status(201).json({
                success: true,
                insertedId: result.insertedId,
                message: "Ticket added successfully",
            });
        });

        // Get My Added Ticket
        app.get("/api/vendor/my-tickets", async (req, res) => {
            const vendorId = req.query.vendorId;

            if (!vendorId) {
                return res.status(400).send({
                    success: false,
                    message: "Vendor id is required",
                });
            }

            const result = await TicketCollection.find({ vendorId })
                .sort({ createdAt: -1 })
                .toArray();

            res.send({
                success: true,
                data: result,
            });
        });

        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!",
        );
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`This server is running on port: ${port}`);
});
