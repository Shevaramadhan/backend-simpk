import { Router } from 'express';
import * as projects from '../controllers/projects.controller';
import * as reviews from '../controllers/reviews.controller';
import * as tasks from '../controllers/tasks.controller';
import auth from '../middlewares/auth.middleware';
import { requireProjectAccess, requireProjectPm } from '../middlewares/project-access.middleware';
import authorize from '../middlewares/role.middleware';
import validate from '../middlewares/validate.middleware';
import { createReviewSchema } from '../validators/reviews.validator';
import {
  createProjectSchema,
  createTaskSchema,
  progressUpdateSchema,
  replaceMembersSchema,
  updateProjectSchema,
  updateTaskSchema,
} from '../validators/projects.validator';

const router = Router();
router.use(auth);

const operasional = authorize('OPERASIONAL');
const pelaksana = authorize('OPERASIONAL', 'TIM');

router.get('/my-tasks', authorize('TIM'), tasks.mine);
router.get('/', projects.list);
router.post('/', operasional, validate(createProjectSchema), projects.create);

router.get('/:projectId', requireProjectAccess(), projects.detail);
router.patch('/:projectId', operasional, requireProjectAccess(), validate(updateProjectSchema), projects.update);
router.put('/:projectId/members', operasional, requireProjectAccess(), validate(replaceMembersSchema), projects.replaceMembers);

router.get('/:projectId/tasks', requireProjectAccess(), tasks.list);
router.post('/:projectId/tasks', pelaksana, requireProjectPm(), validate(createTaskSchema), tasks.create);
router.patch('/:projectId/tasks/:taskId', pelaksana, requireProjectPm(), validate(updateTaskSchema), tasks.update);
router.delete('/:projectId/tasks/:taskId', pelaksana, requireProjectPm(), tasks.remove);

router.post('/:projectId/tasks/:taskId/progress', pelaksana, requireProjectAccess(), validate(progressUpdateSchema), tasks.addProgress);
router.get('/:projectId/updates', requireProjectAccess(), tasks.updates);
router.post('/:projectId/review', authorize('KLIEN'), requireProjectAccess(), validate(createReviewSchema), reviews.create);

export default router;
