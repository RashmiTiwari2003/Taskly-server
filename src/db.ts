import { PrismaClient, Role } from "@prisma/client";
import dotenv from 'dotenv';
import transporter from "./utils/nodeMailer";

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

export async function sendWelcomeMail(email: string, name: string, loginLink: string): Promise<void> {
    const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: `${email}`,
        subject: 'Welcome to Taskly',
        text: `Hey ${name},
        
Welcome to Taskly - we're thrilled to have you on board! 🚀

Our platform is designed to help you stay organized, collaborate effectively, and achieve your goals effortlessly. Whether you're managing personal tasks or working with a team, we've got the tools to make your workflow smooth and efficient.

- Log in to your account: ${loginLink}
- Create your first task: Click on the “New Task” button to get started with your to-dos.
- Explore features: Discover tools like drag-and-drop task boards, due dates, and team collaboration.

If you ever need assistance or have any questions, feel free to reach out to our support team at ${process.env.EMAIL_USER}. We're here to help!

Let's make great things happen together! 🎯
Happy tasking,
The Taskly Team`
    });
}

export async function assignedTaskMail(emails: string[], taskName: string,assignedByEmail:string) {
    const emailBody = `Hello,

You have been assigned a new task!

**Task Name:** ${taskName}
**Assigned By:** ${assignedByEmail}

To get started, log in to your Taskly account and check your task list.
`;

const formattedBody = emailBody
    .replace(/\*\*(.*?)\*\*/g, `<b>$1</b>`)
    .replace(/\n/g, `<br>`);

    const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: emails.join(","),
        subject: 'New Task assigned',
        text: emailBody,
        html: formattedBody
    });
}