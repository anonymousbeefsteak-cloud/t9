require('dotenv').config();
const express = require('express');
const { GoogleGenAI, Type } = require("@google/generative-ai");
const cors = require('cors');
const app = express();

// 配置
app.use(cors());
app.use(express.json());

// 初始化Google GenAI
if (!process.env.GEMINI_API_KEY) {
  console.error('请设置GEMINI_API_KEY环境变量');
  process.exit(1);
}
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 生成餐厅数据
app.get('/api/restaurants', async (req, res) => {
  try {
    console.log('生成餐厅数据...');
    const response = await model.generateContent({
      contents: "请生成8家不同类型的餐厅数据，包括餐厅ID、名称、类别、评分(1-5)、评论数量、配送时间和最低订单金额。评分保留一位小数。",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            restaurants: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "餐厅的唯一识别码。" },
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  reviews: { type: Type.INTEGER },
                  deliveryTime: { type: Type.STRING },
                  minOrder: { type: Type.INTEGER },
                  image: { type: Type.STRING, description: "一个来自 picsum.photos 的 URL，例如：https://picsum.photos/500/300" },
                },
                required: ["id", "name", "category", "rating", "reviews", "deliveryTime", "minOrder", "image"],
              },
            },
          },
        },
      },
    });

    const json = JSON.parse(response.response.text());
    res.json(json.restaurants);

  } catch (error) {
    console.error("生成餐厅数据时发生错误:", error);
    // 提供备用数据以防API调用失败
    res.json([
      { id: '1', name: "炽热电铁板", category: "现代美式料理", rating: 4.7, reviews: 345, deliveryTime: "25-35 分钟", minOrder: 150, image: "https://picsum.photos/500/300?random=1" },
      { id: '2', name: "京都花开寿司", category: "日式料理 & 寿司", rating: 4.9, reviews: 512, deliveryTime: "30-40 分钟", minOrder: 200, image: "https://picsum.photos/500/300?random=2" },
      { id: '3', name: "意大利面万岁", category: "义式料理 & 披萨", rating: 4.6, reviews: 420, deliveryTime: "20-30 分钟", minOrder: 120, image: "https://picsum.photos/500/300?random=3" },
      { id: '4', name: "塔可真好吃", category: "墨西哥料理 & 塔可", rating: 4.5, reviews: 288, deliveryTime: "15-25 分钟", minOrder: 80, image: "https://picsum.photos/500/300?random=4" },
      { id: '5', name: "正宗川菜馆", category: "中式料理", rating: 4.8, reviews: 389, deliveryTime: "30-40 分钟", minOrder: 180, image: "https://picsum.photos/500/300?random=5" },
      { id: '6', name: "法式甜点屋", category: "甜点 & 蛋糕", rating: 4.9, reviews: 267, deliveryTime: "20-30 分钟", minOrder: 100, image: "https://picsum.photos/500/300?random=6" },
      { id: '7', name: "泰式风味", category: "泰式料理", rating: 4.4, reviews: 312, deliveryTime: "25-35 分钟", minOrder: 150, image: "https://picsum.photos/500/300?random=7" },
      { id: '8', name: "健康蔬食", category: "素食 & 健康餐", rating: 4.6, reviews: 198, deliveryTime: "15-25 分钟", minOrder: 120, image: "https://picsum.photos/500/300?random=8" },
    ]);
  }
});

// 生成餐厅菜单
app.post('/api/menu', async (req, res) => {
  try {
    const { restaurantName } = req.body;
    if (!restaurantName) {
      return res.status(400).json({ error: "餐厅名称不能为空" });
    }

    console.log(`为 ${restaurantName} 生成菜单...`);
    const response = await model.generateContent({
      contents: `请为名为 "${restaurantName}" 的餐厅生成一份包含6个品项的真实菜单。对于每个品项，提供唯一的ID、名称和价格（新台币）。每个品项都应包含餐厅名称以供参考。请使用繁体中文回答。`,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            menu: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  restaurantName: { type: Type.STRING, description: "此品项所属的餐厅名称。" }
                },
                required: ["id", "name", "price", "restaurantName"],
              },
            },
          },
        },
      },
    });

    const json = JSON.parse(response.response.text());
    res.json(json.menu);

  } catch (error) {
    console.error(`为 ${req.body.restaurantName} 生成菜单时发生错误:`, error);
    // 提供备用菜单
    const fallbackMenus = {
      "现代美式料理": [
        { id: 'm1', name: "经典汉堡", price: 180, restaurantName: req.body.restaurantName },
        { id: 'm2', name: "起司汉堡", price: 200, restaurantName: req.body.restaurantName },
        { id: 'm3', name: "薯条", price: 80, restaurantName: req.body.restaurantName },
        { id: 'm4', name: "奶昔", price: 120, restaurantName: req.body.restaurantName },
        { id: 'm5', name: "洋葱圈", price: 90, restaurantName: req.body.restaurantName },
        { id: 'm6', name: "招牌沙拉", price: 150, restaurantName: req.body.restaurantName },
      ],
      // 其他菜系的备用菜单...
    };
    
    // 尝试匹配最接近的菜系
    const category = Object.keys(fallbackMenus).find(cat => 
      req.body.restaurantName.includes(cat.split(' ')[0])
    );
    
    res.json(category ? fallbackMenus[category] : fallbackMenus["现代美式料理"]);
  }
});

// 处理订单
app.post('/api/process-order', async (req, res) => {
  try {
    const { orderDetails, cart } = req.body;
    if (!orderDetails || !cart) {
      return res.status(400).json({ error: "订单详情和购物车数据不能为空" });
    }

    console.log('处理订单...');
    const prompt = `一位顾客下了一张美食外送订单。
    顾客资料: ${JSON.stringify(orderDetails)}。
    订单品项: ${cart.map(item => `${item.name} x${item.quantity}`).join(', ')}。
    请根据这些信息，生成一个唯一的订单编号（格式：ORD-XXXXXX）和一个真实的预计送达时间（例如：25-35 分钟）。`;

    const response = await model.generateContent({
      contents: prompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            orderNumber: { type: Type.STRING },
            estimatedDeliveryTime: { type: Type.STRING },
          },
          required: ["orderNumber", "estimatedDeliveryTime"],
        },
      },
    });

    const json = JSON.parse(response.response.text());
    res.json(json);

  } catch (error) {
    console.error("处理订单时发生错误:", error);
    // 提供备用订单信息
    res.json({
      orderNumber: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      estimatedDeliveryTime: "20-30 分钟",
    });
  }
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('可用端点:');
  console.log(`GET  http://localhost:${PORT}/api/restaurants - 获取餐厅列表`);
  console.log(`POST http://localhost:${PORT}/api/menu - 获取餐厅菜单`);
  console.log(`POST http://localhost:${PORT}/api/process-order - 处理订单`);
  console.log(`GET  http://localhost:${PORT}/api/health - 健康检查`);
});
