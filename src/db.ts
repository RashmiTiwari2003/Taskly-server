import { PrismaClient, Role } from "@prisma/client";
import dotenv from 'dotenv';

dotenv.config();

export const prisma = new PrismaClient();

export interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    phone: string;
    profileUpdate: boolean;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    createdById: string | null
}

export interface Tasks {
    name: string;
    content: string;
    assignedByEmail: string;
    assignedToEmails: string[];
}

export const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log('Connected to Database');
    } catch (error) {
        console.log('Error conencting to Database: ', error.message);
    }
}

export const findAllUsers = async () => {
    try {
        const users = await prisma.user.findMany({
            include: {
                Business: {
                    select: {
                        name: true
                    }
                }
            }
        });
        return users;
    } catch (error) {
        return null;
    }
}

export const findAllUsersInBusiness = async (businessId: string) => {
    const users = await prisma.user.findMany({
        where: { businessId },
        include: {
            Business: {
                select: {
                    name: true
                }
            }
        }
    })

    return users
}

export const findUserByID = async (id: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: id }
        })

        return user;
    } catch (error) {
        return null;
    }
}

export const findUserByEmail = async (email: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });
        return user;
    } catch (error) {
        return null;
    }
}

export const findBusinessByID = async (id: string) => {
    try {
        const business = await prisma.business.findUnique({
            where: { id }
        });
        return business
    } catch (error) {
        return null;
    }
}

export const createUser = async (name: string, email: string, phone: string, password: string, role: Role, businessName: string, createdById: string) => {
    let business = await prisma.business.findUnique({
        where: {
            name: businessName,
        },
    });

    if (!business) {
        business = await prisma.business.create({
            data: {
                name: businessName,
                adminName: name,
                adminEmail: email,
                columns: {
                    createMany: ({
                        data: [
                            { name: 'To do', order: 0 },
                            { name: 'Done', order: 1 }
                        ],
                    })
                }
            },
            include: {
                columns: true
            }
        });
    }

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password,
            role,
            phone,
            profileUpdate: true,
            createdById,
            businessId: business.id,
        }
    });

    if (!user) {
        return null;
    }

    return user;

}

export const updateUser = async (payload: Partial<User>, email: string) => {
    const user = await prisma.user.update({
        where: {
            email
        },
        data: payload
    });

    return user;
}

export const deleteUser = async (email: string) => {
    const user = await prisma.user.delete({
        where: {
            email: email
        }
    });

    return user;
}

export const getAllColumns = async (businessId: string) => {
    const columns = await prisma.columns.findMany({
        where: {
            businessId: businessId
        },
        include: {
            Tasks: true,
        },
        orderBy: {
            order: 'asc',
        },
    });

    return columns;
}

export const getColumn = async (id: string) => {
    const column = await prisma.columns.findUnique({
        where: { id },
    });

    return column
}

export const countColumns = async () => {
    const numberOfColumns = await prisma.columns.count();

    return numberOfColumns
}

export const createColumn = async (name: string, email: string, businessId: string, index: number) => {
    await prisma.columns.updateMany({
        where: {
            order: {
                gte: index,
            },
        },
        data: {
            order: {
                increment: 1,
            },
        },
    });

    const newColumn = await prisma.columns.create({
        data: {
            name,
            order: index,
            businessId: businessId
        },
        include: {
            Tasks: true,
        }
    })

    if (!newColumn) {
        return null;
    }

    return newColumn
}

export const updateColumnName = async (id: string, name: string) => {
    const column = await prisma.columns.update({
        where: { id },
        data: {
            name
        }
    })

    return column
}

export const updateColumn = async (id: string, name: string, order: number) => {
    const column = await prisma.columns.update({
        where: { id },
        data: {
            name,
            order
        }
    })

    return column
}

export const incrementColumnIndex = async (startIndex: number, endIndex: number) => {
    return await prisma.columns.updateMany({
        where: {
            order: {
                gte: startIndex,
                lte: endIndex,
            },
        },
        data: {
            order: {
                increment: 1,
            },
        },
    });
};


export const decrementColumnIndex = async (startIndex: number, endIndex: number) => {
    return await prisma.columns.updateMany({
        where: {
            order: {
                gt: startIndex,
                lte: endIndex,
            },
        },
        data: {
            order: {
                decrement: 1,
            },
        },
    });
};

export const decrementColumnIndexDelete = async (deletedOrder: number) => {
    return await prisma.columns.updateMany({
        where: {
            order: {
                gt: deletedOrder,
            },
        },
        data: {
            order: {
                decrement: 1,
            },
        },
    });
}


export const deleteColumn = async (id: string) => {
    const column = await prisma.columns.delete({
        where: {
            id
        }
    })

    return column
}

export const createTask = async (name: string, content: string, columnId: string, email: string) => {
    const newTask = await prisma.tasks.create({
        data: {
            name,
            content,
            assignedByEmail: email,
            Column: {
                connect: {
                    id: columnId
                }
            }
        }
    })

    if (!newTask) {
        return null
    }

    return newTask
}

export const getTask = async (id: string) => {
    const tasks = await prisma.tasks.findUnique({
        where: {
            id: id,
        },
    });

    return tasks;
}

export const editTask = async (id: string, name: string, content: string, assignedByEmail: string, assignedToEmails: string[], columnId: string, startDate: Date | null, dueDate: Date | null) => {
    const task = await prisma.tasks.update({
        where: {
            id
        },
        data: {
            name,
            content,
            assignedByEmail,
            assignedToEmails,
            startDate,
            dueDate,
            Column: {
                connect: {
                    id: columnId,
                },
            },
        }
    })

    return task
}

export const deleteTask = async (id: string) => {
    const task = await prisma.tasks.delete({
        where: {
            id
        }
    })

    return task
}

export const disconnectDB = async () => {
    try {
        await prisma.$disconnect();
        console.log('Disconnected from Database');
    } catch (error) {
        console.log('Error discnnecting from database: ', error.message);
    }
}