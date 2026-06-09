/**
 * 路由汇总模块
 * 将所有子路由模块整合到一起
 */

import { Router } from 'express';
import userRoutes from './userRoutes';
import itemRoutes from './itemRoutes';
import orderRoutes from './orderRoutes';
import resourceRoutes from './resourceRoutes';
import chatRoutes from './chatRoutes';
import notificationRoutes from './notificationRoutes';
import reportRoutes from './reportRoutes';
import * as itemController from '../controllers/itemController';

const router = Router();

// 用户相关路由
router.use('/users', userRoutes);

// 物品相关路由
router.use('/items', itemRoutes);

// 分类路由（独立路径 /api/categories）
router.get('/categories', itemController.getCategories);

// 订单相关路由
router.use('/orders', orderRoutes);

// 资源共享路由
router.use('/resources', resourceRoutes);

// 聊天路由
router.use('/chat', chatRoutes);

// 通知路由
router.use('/notifications', notificationRoutes);

// 举报路由
router.use('/reports', reportRoutes);

export default router;
