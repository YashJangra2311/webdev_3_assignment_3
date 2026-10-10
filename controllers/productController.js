const Product = require('../models/Product');

exports.createProduct = async (req, res, next) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (error) {
        next(error);
    }
};

exports.getAllProducts = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, category, sort } = req.query;
        const query = {};
        if (category) query.category = category;

        const sortOptions = {};
        if (sort) {
            const [field, order] = sort.split(':');
            sortOptions[field] = order === 'desc' ? -1 : 1;
        }

        const limitNum = parseInt(limit, 10);
        const skip = (parseInt(page, 10) - 1) * limitNum;

        const total = await Product.countDocuments(query);
        const products = await Product.find(query).sort(sortOptions).skip(skip).limit(limitNum);

        res.status(200).json({
            total,
            page: parseInt(page, 10),
            totalPages: Math.ceil(total / limitNum),
            count: products.length,
            products
        });
    } catch (error) {
        next(error);
    }
};

exports.getInventorySummary = async (req, res, next) => {
    try {
        const summary = await Product.aggregate([
            {
                $group: {
                    _id: "$category",
                    totalItems: { $sum: 1 },
                    totalQuantity: { $sum: "$quantity" },
                    totalStockValue: { $sum: { $multiply: ["$price", "$quantity"] } },
                    avgPrice: { $avg: "$price" }
                }
            }
        ]);
        res.status(200).json({ categories: summary.length, summary });
    } catch (error) {
        next(error);
    }
};

exports.getLowStockProducts = async (req, res, next) => {
    try {
        const lowStockItems = await Product.find({
            $expr: { $lte: ["$quantity", "$reorderLevel"] }
        });
        res.status(200).json({ count: lowStockItems.length, lowStockItems });
    } catch (error) {
        next(error);
    }
};

exports.getProductById = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

exports.updateProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

exports.deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.status(200).json({ message: "Product deleted", id: product._id });
    } catch (error) {
        next(error);
    }
};

exports.updateStock = async (req, res, next) => {
    try {
        const { change } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });
        
        product.quantity += parseInt(change, 10);
        await product.save();
        res.status(200).json({ message: "Stock updated", product });
    } catch (error) {
        next(error);
    }
};