import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { findUserByEmail } from '../db'
import { Role } from '@prisma/client';

const SECRET = process.env.SECRET;

interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    profileUpdate: boolean;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    createdById: string | null
}

interface CustomRequest extends Request {
    creatorId?: string;
    user?: User;
}

const adminRouter = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const header = req.headers['authorization'];
    const token = header.split(' ')[1];

    if (!token) {
        console.log('Invalid token');
        res.status(401).json({ message: 'Invalid token' });
        return;
    }

    try {
        const data = jwt.verify(token, SECRET) as User;

        const user = await findUserByEmail(data.email);

        if (!user) {
            console.log('User Not found');
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if ((user.role === Role.SuperAdmin) || (user.role === Role.Admin)) {
            req.user=user;
            req.creatorId = user.id;
            next();
            return;
        }

        console.log('Access Denied! You are not authorized to perform this action.');
        res.status(401).json({ message: 'Access Denied! You are not authorized to perform this action.' });
    } catch (error) {
        res.status(400).json({ message: `Error Occured: ${error}` });
    }
}

export default adminRouter