import { Role } from "@prisma/client"
import { prisma } from "../db"
import bcrypt from 'bcrypt'

const automate_saving_super_admin = async () => {
    const existingSuperAdmin = await prisma.user.count({
        where: {
            role: Role.SuperAdmin
        }
    })

    if (existingSuperAdmin > 0) {
        console.log('Super Admin with the same credentials already exists. Skipping insertion.')
        return;
    }

    else {
        const password = process.env.PASSWORD;

        const hashedPassword = await bcrypt.hash(password, 10);

        const existingBusiness = await prisma.business.count({
            where: {
                name: 'Test'
            }
        })

        if (existingBusiness == 0) {
            const superAdminBusiness = await prisma.business.create({
                data: {
                    name: 'Test',
                    adminName: 'Rashmi',
                    adminEmail: 'rashmi@test.com',
                }
            })

            const newSuperAdmin = await prisma.user.create({
                data: {
                    name: 'Rashmi',
                    email: 'rashmi@test.com',
                    password: hashedPassword,
                    role: Role.SuperAdmin,
                    profileUpdate: false,
                    createdById: null,
                    businessId: superAdminBusiness.id
                }
            });
        }
        else {
            const business = await prisma.business.findUnique({
                where: {
                    name: 'Test'
                }
            })
            const newSuperAdmin = await prisma.user.create({
                data: {
                    name: 'Rashmi',
                    email: 'rashmi@test.com',
                    password: hashedPassword,
                    role: Role.SuperAdmin,
                    profileUpdate: false,
                    createdById: null,
                    businessId: business.id
                }
            });
        }

        console.log('Super Admin inserted successfully');
    }
}

export const automate_creating_default_column = async () => {
    const existingColumns = await prisma.columns.count()

    if (existingColumns > 0) {
        console.log('Columns already exists. Skipping insertion.')
        return;
    }

    else {
        const existingBusiness = await prisma.business.findUnique({
            where: {
                name: 'Test'
            }
        })

        const defaultColumns = await prisma.columns.createMany({
            data: [
                { name: 'To do', order: 0, businessId: existingBusiness.id },
                { name: 'Done', order: 1, businessId: existingBusiness.id }
            ],
        })

        console.log('Default Columns inserted successfully');
    }
}

export default automate_saving_super_admin;