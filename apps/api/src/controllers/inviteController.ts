import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

export class InviteController {
  public validateInviteCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { code, phone_number } = req.body;

    // Look up user by invite code and phone number
    const user = await prisma.user.findFirst({
      where: {
        inviteCode: code,
        phoneNumber: phone_number,
      },
    });

    if (!user) {
      throw new AppError('Invalid invite code or phone number', 404);
    }

    // Generate JWT token with 30-day expiration
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError('JWT_SECRET not configured', 500);
    }

    const token = jwt.sign(
      { user_id: user.id },
      jwtSecret,
      { expiresIn: '30d' }
    );

    // Prepare response with derived fields
    const responseUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      hasConnectedBank: user.plaidAccessToken !== null,
      twilioStatus: user.phoneVerified ? 'verified' : 'unverified',
    };

    res.status(200).json({
      user: responseUser,
      token,
    });
  });
}
