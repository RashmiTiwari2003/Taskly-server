import express from 'express';
import { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { connectDB, createUser, findUserByEmail, updateUser, User, findAllUsers, deleteUser, getAllColumns, findBusinessByID, createColumn, createTask, deleteColumn, editTask, getTask, deleteTask, updateColumn, findUserByID, prisma, countColumns, decrementColumnIndex, incrementColumnIndex, getColumn, decrementColumnIndexDelete, updateColumnName, findAllUsersInBusiness } from "./db";
import { Role } from '@prisma/client';
import adminRouter from './middleware/admin_middleware';
import superAdminRouter from './middleware/superadmin_middleware';
import validateTokenRouter from './middleware/validatetoken_middleware';
import automate_saving_super_admin from './utils/defaultDBInsert';
import { automate_creating_default_column } from './utils/defaultDBInsert';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.SECRET;

app.use(cors());
app.use(express.json());
connectDB();
automate_saving_super_admin()
automate_creating_default_column()

interface CustomRequest extends Request {
    creatorId?: string;
    user?: User;
}

app.get('/', (req: Request, res: Response) => {
    res.status(200).send('Hello from backend');
})

app.post('/login', async (req: Request, res: Response) => {
    const { payload } = req.body;
    const { email, password } = payload;

    if (!email || !password) {
        res.status(404).json({ message: 'Missing Fields' });
        return;
    }

    try {
        const user = await findUserByEmail(email);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const isPassValid = await bcrypt.compare(password, user.password);
        if (!isPassValid) {
            res.status(401).json({ message: 'Invalid Password' });
            return;
        }

        const payload = { id: user.id, email: user.email }

        const token = jwt.sign(payload, SECRET);

        res.status(200).json({
            message: 'Login successful',
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            },
            token
        });
    } catch (error) {
        console.log('Error occured while logging in');
        res.status(500).json({ message: 'Error occured' });
        return;
    }
})

app.post('/validateToken', validateTokenRouter, async (req: CustomRequest, res: Response) => {
    res.status(200).json({
        message: 'Token is valid',
        user: req.user
    });
    return;
})

app.get('/findUser/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await findUserByID(id);

        if (user) {
            res.status(200).json({ message: 'Success', email: user.email });
            return;
        }

        res.status(400).json({ message: 'Error user with id' });
    } catch (error) {
        console.log('Error finding all user');
        res.status(500).json({ message: 'Error occured' });
        return;
    }
})

app.get('/users', async (req: Request, res: Response) => {
    try {
        const users = await findAllUsers();

        if (users) {
            res.status(200).json({ message: 'Success', users });
            return;
        }

        res.status(400).json({ message: 'Error finding all Users' });
    } catch (error) {
        console.log('Error finding all user');
        res.status(500).json({ message: 'Error occured' });
        return;
    }
})

app.get('/usersbusiness/:email', async (req: Request, res: Response) => {
    const { email } = req.params;
    try {
        const user = await findUserByEmail(email);

        const users = await findAllUsersInBusiness(user.businessId);

        if (users) {
            res.status(200).json({ message: 'Success', users });
            return;
        }

        res.status(400).json({ message: 'Error finding all Users' });
        return;
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
})

app.post('/createUser', async (req: CustomRequest, res: Response) => {
    try {
        const { payload } = req.body
        const { name, email, phone, password, role, businessName } = payload;

        if (!name || !email || !password || !role || !businessName) {
            res.status(404).json({ message: 'Missing Fields' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' })
            return;
        }

        if (role === Role.SuperAdmin) {
            superAdminRouter(req, res, async () => {
                const user = await createUser(name, email, phone, hashedPassword, role, businessName, req.creatorId)

                if (!user) {
                    res.status(400).json({ message: 'Error ocurred: User not created' })
                    return;
                }

                res.status(200).json({ message: 'User created successfully', id: user.id })
                return;
            })
        } else {
            adminRouter(req, res, async () => {
                const user = await createUser(name, email, phone, hashedPassword, role, businessName, req.creatorId)

                if (!user) {
                    res.status(400).json({ message: 'Error ocurred: User not created' })
                    return;
                }

                res.status(200).json({ message: 'User created successfully', id: user.id })
                return;
            })
        }
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
})

app.post('/edit', async (req: CustomRequest, res: Response) => {
    try {
        const { payload, userEmail } = req.body;

        const findUser = await findUserByEmail(userEmail);

        const role = findUser.role;

        if (role === Role.SuperAdmin) {
            superAdminRouter(req, res, async () => {
                const user = await updateUser(payload, userEmail);

                if (!user) {
                    res.json(400).json({ message: 'Error updating User' })
                }
                res.status(200).json({
                    message: 'User Info updated successfully', user: {
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        phone: user.phone,
                    },
                })
            })
        } else {
            adminRouter(req, res, async () => {
                const user = await updateUser(payload, userEmail);

                if (!user) {
                    res.json(400).json({ message: 'Error updating User' })
                }
                res.status(200).json({
                    message: 'User Info updated successfully', user: {
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        phone: user.phone,
                    },
                })
            })
        }
    } catch (error) {
        console.error('Error editing users:', error);
        res.status(500).json({ message: 'Error editing users' });
    }
})

app.post('/update', async (req: Request, res: Response) => {
    try {

        const { payload, email } = req.body;
        const { password } = payload;
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10)
            payload.password = hashedPassword
        }
        console.log(payload, email);
        const user = await updateUser(payload, email);
        const business = await findBusinessByID(user.businessId)
        if (!user) {
            res.json(400).json({ message: 'Error updating User' })
        }
        res.status(200).json({
            message: 'User Info updated successfully', user: {
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                businessName: business.name
            },
        })
    } catch (error) {
        console.error('Error updating users:', error);
        res.status(500).json({ message: 'Error updating users' });
    }
})

app.post('/me', async (req: Request, res: Response) => {
    try {

        const { token } = req.body;

        if (!token) {
            console.log('Invalid token');
            res.status(500).json({ message: 'Invalid token' });
            return;
        }

        const data = jwt.verify(token, SECRET) as User;
        const user = await findUserByEmail(data.email)

        const business = await findBusinessByID(user.businessId)

        res.status(200).json({
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                businessName: business.name
            }
        })
    } catch (error) {
        console.error('Error fetching logged user details:', error);
        res.status(500).json({ message: 'Error fetching logged user details' });
    }
})

app.delete('/delete/:userEmail', adminRouter, async (req: CustomRequest, res: Response) => {
    try {

        const { userEmail } = req.params;

        const findUser = await findUserByEmail(userEmail);

        const role = findUser.role;

        if (role === Role.SuperAdmin) {
            superAdminRouter(req, res, async () => {
                const user = await deleteUser(userEmail);

                if (!user) {
                    res.json(400).json({ message: 'Error deleting User' })
                }
                res.status(200).json({ message: 'User deleted successfully' })
            })
        } else {
            adminRouter(req, res, async () => {
                const user = await deleteUser(userEmail);

                if (!user) {
                    res.json(400).json({ message: 'Error deleting User' })
                }
                res.status(200).json({ message: 'User deleted successfully' })
            })
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
})

app.get('/columns/:email', async (req: Request, res: Response) => {
    const { email } = req.params;
    try {
        const user = await findUserByEmail(email);
        const columns = await getAllColumns(user.businessId)

        if (columns) {
            res.status(200).json({ message: 'Success', columns });
            return;
        }

        res.status(400).json({ message: 'Error finding Columns' });
    } catch (error) {
        console.error('Error fetching columns with businessId:', error);
        res.status(500).json({ message: 'Error fetching businessId' });
    }
})

app.post('/columns', adminRouter, async (req: CustomRequest, res: Response) => {
    try {
        const { payload } = req.body
        let { name, index } = payload

        if (index === undefined) {
            const count = await countColumns();
            index = count;
        }

        const creator = await findUserByEmail(req.user.email)

        const column = await createColumn(name, creator.email, creator.businessId, index)

        if (!column) {
            res.status(400).json({ message: 'Error ocurred: Column not created' })
            return;
        }

        res.status(200).json({ message: 'Column created successfully', column })
        return;
    } catch (error) {
        console.error('Error creating column:', error);
        res.status(500).json({ message: 'Error creating column' });
    }
})

app.patch('/columnName', adminRouter, async (req: CustomRequest, res: Response) => {
    const { payload } = req.body;
    const { id, name } = payload
    try {
        const column = await updateColumnName(id, name);

        if (column) {
            res.status(200).json({ message: 'Column Name updated' });
            return;
        }

        res.status(400).json({ mesaage: "Name updation unsuccessful" });
        return
    } catch (error) {
        console.error('Error updating name:', error);
        res.status(500).json({ message: 'Error updating name' });
    }
})

app.patch('/columns', async (req, res) => {
    const columns = req.body;

    if (!Array.isArray(columns)) {
        res.status(400).json({ message: 'Invalid payload format' });
        return;
    }

    try {
        const existingColumns = await prisma.columns.findMany();

        const updatedColumns = new Map<string, { name: string, order: number }>();

        columns.forEach((column, index) => {
            updatedColumns.set(column.id, {
                name: column.name,
                order: column.order,
            });
        });

        const updatedColumnsPromises = existingColumns.map(async (column) => {
            if (updatedColumns.has(column.id)) {
                const { name, order } = updatedColumns.get(column.id)!;
                return updateColumn(column.id, name, order)
            }
            else {
                return updateColumn(column.id, column.name, column.order)
            }
        });

        res.status(200).json({ message: 'Columns updated successfully' });
        return;
    } catch (error) {
        console.error('Error updating columns:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.delete('/columns/:columnId', adminRouter, async (req: CustomRequest, res: Response) => {
    const { columnId } = req.params;

    try {
        const column = await getColumn(columnId)

        if (!column) {
            res.status(404).json({ message: 'Column not found' });
            return;
        }

        const deletedOrder = column.order;

        const delColumn = await deleteColumn(columnId);

        await decrementColumnIndexDelete(deletedOrder);

        if (!column) {
            res.json(400).json({ message: 'Error deleting Column' })
        }

        res.status(200).json({ message: 'Column deleted successfully' });
        return;
    } catch (error) {
        console.error('Error deleting column:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/tasks/:taskId', async (req: Request, res: Response) => {
    const { taskId } = req.params;
    try {
        const task = await getTask(taskId)

        if (task) {
            res.status(200).json({ message: 'Task found', task });
            return;
        }

        res.status(400).json({ message: 'Error finding Task' });
        return;
    } catch (error) {
        console.error('Error finding task:', error);
        res.status(500).json({ message: 'Error finding task' });
    }
})

app.post('/tasks', adminRouter, async (req: CustomRequest, res: Response) => {
    try {

        const { payload, columnId } = req.body;

        const { name, content } = payload;

        const creator = await findUserByEmail(req.user.email)

        const task = await createTask(name, content, columnId, creator.email)

        if (!task) {
            res.status(400).json({ message: 'Error ocurred: Task not created' })
            return;
        }

        res.status(200).json({ message: 'Task created successfully' })
        return;
    } catch (error) {
        console.error('Error creating tasks:', error);
        res.status(500).json({ message: 'Error creating tasks' });
    }
})

app.put('/tasks/:taskId', async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const { payload } = req.body;

    if (!taskId) {
        res.json(400).json({ message: 'Task ID not found' });
        return;
    }

    try {
        const task = await getTask(taskId);

        if (!task) {
            res.json(400).json({ message: 'Task not found' });
        }

        const updatedTask = await editTask(taskId, payload.name, payload.content, payload.assignedByEmail, payload.assignedToEmails, payload.columnId, payload.startDate, payload.dueDate);

        if (!updatedTask) {
            res.json(400).json({ message: 'Error updating Task' })
        }
        res.status(200).json({ message: 'Task updated successfully' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
})

app.delete('/tasks/:taskId', adminRouter, async (req: CustomRequest, res: Response) => {
    try {
        const { taskId } = req.params;

        const task = await deleteTask(taskId);

        if (!task) {
            res.json(400).json({ message: 'Error deleting Task' })
        }
        res.status(200).json({ message: 'Task deleted successfully' })
    } catch (error) {
        console.error('Error deleting tasks:', error);
        res.status(500).json({ message: 'Error deleting tasks' });
    }
})

app.listen(PORT, () => {
    console.log("Server is running on port", PORT);
});