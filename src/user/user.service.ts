import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { LoginDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { User, UserRole } from './entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { VideoService } from 'src/video/video.service';
import { Video } from 'src/video/entities/video.entity';
import { GoogleLoginDto } from './dto/google-login.dto';

@Injectable()
export class UserService {
  private db;

  constructor(
    @Inject('FIREBASE_ADMIN') private firebaseAdmin,
    private videoService: VideoService,
  ) {
    const db = this.firebaseAdmin.firestore();
    db.settings({ ignoreUndefinedProperties: true }); // Applique l'option ici
    this.db = db;
  }
  //Register User
  async registerUser(registerUser: RegisterUserDto): Promise<User> {
    let userRecord;
    try {
      console.log("Vérification de l'email:", registerUser.email);
      const snapshot = await this.db
        .collection('users')
        .where('email', '==', registerUser.email)
        .get();

      if (!snapshot.empty) {
        throw new BadRequestException(
          'Un utilisateur avec cet email existe déjà.',
        );
      }

      console.log("Création de l'utilisateur dans Firebase Auth...");
      userRecord = await this.firebaseAdmin.auth().createUser({
        displayName: `${registerUser.firstName} ${registerUser.lastName}`,
        email: registerUser.email,
        password: registerUser.password,
      });
      console.log('Utilisateur créé avec UID:', userRecord.uid);

      const user: User = {
        id: userRecord.uid,
        email: registerUser.email,
        role: registerUser.role as UserRole,
        firstName: registerUser.firstName,
        lastName: registerUser.lastName,
        phoneNumber: '',
        avatar: '',
        bio: '',
        location: '',
        latitude: 0,
        longitude: 0,
        createdAt: new Date(),
        videoCount: 0,
        participationCount: 0,
        followerCount: 0,
        balance: 0,
        followersList: [],
      };

      console.log('Enregistrement dans Firestore avec ID:', user.id);
      await this.db.collection('users').doc(user.id).set(user);
      return user;
    } catch (error) {
      if (userRecord?.uid) {
        console.log(
          "Tentative de suppression de l'utilisateur:",
          userRecord.uid,
        );
        await this.firebaseAdmin
          .auth()
          .deleteUser(userRecord.uid)
          .catch((e) => console.error('Échec de la suppression:', e));
      }
      console.error('Erreur détaillée:', error);
      throw new BadRequestException(
        "Erreur lors de l'inscription : " + error.message,
      );
    }
  }
  //LOGIN USER
  async loginUser(
    loginDto: LoginDto,
  ): Promise<{ idToken: string; refreshToken: string }> {
    try {
      const { email, password } = loginDto;
      const response = await fetch(
        'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' +
          process.env.APIKEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        },
      );
      const data = await response.json();
      if (!data.idToken) {
        throw new BadRequestException(
          data.error?.message || 'Échec de la connexion',
        );
      }
      return { idToken: data.idToken, refreshToken: data.refreshToken };
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors de la connexion : ' +
          (error.message || 'Identifiants invalides'),
      );
    }
  }

  // update User

  async updateUser(uid: string, updateUserDto: UpdateUserDto): Promise<User> {
    console.log('Entrée dans updateUser - UID:', uid, 'DTO:', updateUserDto);
    try {
      const userRef = this.db.collection('users').doc(uid);
      const doc = await userRef.get();
      if (!doc.exists) {
        throw new BadRequestException('Utilisateur non trouvé.');
      }

      let avatarUrl = doc.data()?.avatar || '';
      if (
        updateUserDto.avatar &&
        (updateUserDto.avatar as Express.Multer.File).buffer
      ) {
        console.log("Préparation de l'upload de l'avatar");
        const file = updateUserDto.avatar as Express.Multer.File;
        if (!file.buffer) {
          throw new BadRequestException(
            "Erreur : Le buffer de l'image est introuvable.",
          );
        }
        const bucket = this.firebaseAdmin.storage().bucket();
        console.log('Bucket utilisé:', bucket.name);
        const filename = `avatars/${uid}/${Date.now()}_${file.originalname}`;
        const fileUpload = bucket.file(filename);

        await fileUpload.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
            cacheControl: 'public, max-age=31536000', // Cache d'un an
          },
        });
        console.log("Upload terminé, génération de l'URL Firebase");
        // Générer une URL Firebase qui respecte les règles de sécurité
        avatarUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media`;
        console.log('URL Firebase générée:', avatarUrl);
      }
      // get stored birthdate safely (Firestore Timestamp or ISO)
      const rawBirth = doc.data()?.birthdate;
      const storedBirthdate = rawBirth
        ? rawBirth.toDate
          ? rawBirth.toDate()
          : new Date(rawBirth)
        : undefined;

      const updatedUser: User = {
        id: uid,
        email: doc.data()?.email || '',
        role: doc.data()?.role || UserRole.Listener,
        firstName: updateUserDto.firstName || doc.data()?.firstName || '',
        lastName: updateUserDto.lastName || doc.data()?.lastName || '',
        phoneNumber: updateUserDto.phoneNumber || doc.data()?.phoneNumber || '',
        avatar: avatarUrl,
        bio: updateUserDto.bio || doc.data()?.bio || '',
        location: updateUserDto.location || doc.data()?.location || '',
        latitude: updateUserDto.latitude || doc.data()?.latitude || 0,
        longitude: updateUserDto.longitude || doc.data()?.longitude || 0,
        createdAt: doc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: new Date(),
        videoCount: doc.data()?.videoCount || 0,
        balance: doc.data()?.balance || 0,
        birthdate: updateUserDto.birthdate
          ? new Date(updateUserDto.birthdate)
          : storedBirthdate,
      };

      await userRef.set(updatedUser);
      console.log('Utilisateur mis à jour avec succès');
      return updatedUser;
    } catch (error) {
      console.error('Erreur dans updateUser:', error.message, error.stack);
      throw new BadRequestException(
        'Erreur lors de la mise à jour : ' + error.message,
      );
    }
  }

  async validateRequest(req): Promise<boolean> {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      console.warn('[validateRequest] No authorization header found');
      return false;
    }
    
    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      console.warn('[validateRequest] Invalid authorization header format');
      return false;
    }
    
    try {
      console.log('[validateRequest] Verifying ID token...');
      const decodedToken = await this.firebaseAdmin.auth().verifyIdToken(token);
      
      if (!decodedToken || !decodedToken.uid) {
        console.error('[validateRequest] Invalid token: No UID in decoded token');
        return false;
      }
      
      console.log(`[validateRequest] Token valid for UID: ${decodedToken.uid}`);
      
      // Check if user exists in Firestore
      const userRef = this.db.collection('users').doc(decodedToken.uid);
      const userDoc = await userRef.get();
      //console.log(userDoc)
      //console.log("-----------"userRef)
// 1️⃣ Crée la référence vers le document
const userRef1 = this.db.collection('users').doc(decodedToken.uid);

// 2️⃣ Récupère le document
const userDoc1 = await userRef1.get();


      if (!userDoc1.exists) {
        console.log(`[validateRequest] User not found in Firestore, creating document for UID: ${decodedToken.uid}`);
        
        // Get user info from Firebase Auth
        const userRecord = await this.firebaseAdmin.auth().getUser(decodedToken.uid);
        
        // Create user document with default values
        const newUser: Partial<User> = {
          id: decodedToken.uid,
          email: userRecord.email || '',
          firstName: userRecord.displayName?.split(' ')[0] || '',
          lastName: userRecord.displayName?.split(' ').slice(1).join(' ') || '',
          role: UserRole.Listener, // Default role
          phoneNumber: userRecord.phoneNumber || '',
          avatar: userRecord.photoURL || '',
          bio: '',
          createdAt: this.firebaseAdmin.firestore.FieldValue.serverTimestamp(),
          updatedAt: this.firebaseAdmin.firestore.FieldValue.serverTimestamp(),
          videoCount: 0,
          participationCount: 0,
          followerCount: 0,
          balance: 0,
          followersList: []
        };
        
        // Create the user document
        await userRef.set(newUser);
        console.log(`[validateRequest] Created new user document for UID: ${decodedToken.uid}`);
      }
      
      console.log(`[validateRequest] User ${decodedToken.uid} authenticated successfully`);
      return true;
      
    } catch (error) {
      console.error('[validateRequest] Authentication failed:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // For auth errors, return false to maintain backward compatibility
      return false;
    }
  }

  async validateToken(idToken: string): Promise<boolean> {
    try {
      await this.firebaseAdmin.auth().verifyIdToken(idToken);
      return true;
    } catch (error) {
      throw new BadRequestException('Token invalide : ' + error.message);
    }
  }

  async forgetPassword(email: string): Promise<{ message: string }> {
    try {
      const apiKey = process.env.APIKEY; // Assurez-vous que APIKEY est défini dans .env
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email: email,
          }),
        },
      );
      const data = await response.json();
      if (!data.email) {
        throw new Error(data.error?.message || "Échec de l'envoi de l'email");
      }
      return {
        message:
          'Demande de réinitialisation enregistrée. Vérifiez votre email.',
      };
    } catch (error) {
      if (error.message.includes('EMAIL_NOT_FOUND')) {
        return { message: 'Aucun utilisateur trouvé avec cet email.' };
      }
      throw new BadRequestException(
        'Erreur lors de la demande de réinitialisation : ' + error.message,
      );
    }
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<void> {
    try {
      await this.firebaseAdmin.auth().verifyPasswordResetCode(token);
      await this.firebaseAdmin.auth().confirmPasswordReset(token, newPassword);
      console.log(`Mot de passe réinitialisé pour ${email}`);
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors de la réinitialisation du mot de passe : ' + error.message,
      );
    }
  }

  async changePassword(
    uid: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    try {
      const { currentPassword, newPassword } = changePasswordDto;
      console.log('Tentative de changement de mot de passe pour uid:', uid);

      // Récupérer l'email associé au uid
      const userRecord = await this.firebaseAdmin.auth().getUser(uid);
      const email = userRecord.email;
      console.log('Email associé:', email);

      // Ré-authentification avec l'ancien mot de passe
      const response = await fetch(
        'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' +
          process.env.APIKEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: currentPassword,
            returnSecureToken: true,
          }),
        },
      );
      const data = await response.json();
      console.log("Réponse de l'API:", data);
      if (!data.idToken) {
        throw new BadRequestException(
          'Mot de passe actuel incorrect : ' + (data.error?.message || ''),
        );
      }

      // Mise à jour du mot de passe
      await this.firebaseAdmin
        .auth()
        .updateUser(uid, { password: newPassword });
      console.log(`Mot de passe changé avec succès pour l'utilisateur ${uid}`);
    } catch (error) {
      console.error('Erreur détaillée:', error);
      throw new BadRequestException(
        'Erreur lors du changement de mot de passe : ' + error.message,
      );
    }
  }

  async deleteUser(uid: string): Promise<void> {
    try {
      await this.firebaseAdmin.auth().deleteUser(uid);

      const userRef = this.db.collection('users').doc(uid);
      const doc = await userRef.get();
      if (doc.exists) {
        await userRef.delete();
        const docAfterDelete = await userRef.get();
        if (!docAfterDelete.exists) {
        } else {
          throw new BadRequestException(
            'La suppression dans Firestore a échoué.',
          );
        }
      } else {
      }
    } catch (error) {
      throw new BadRequestException(
        "Erreur lors de la suppression de l'utilisateur : " + error.message,
      );
    }
  }

  async getUserProfile(
    uid: string,
  ): Promise<User & { videoCount: number; videos: Video[] }> {
    try {
      const userRef = this.db.collection('users').doc(uid);
      const doc = await userRef.get();
      if (!doc.exists) {
        throw new BadRequestException('Utilisateur non trouvé.');
      }

      const userData = doc.data() as User;
      const videos = await this.videoService.getVideosByUserId(uid);
      const videoCount = videos.length;
      // normalize birthdate stored as Firestore Timestamp or ISO/string
      const rawBirth = userData.birthdate || doc.data()?.birthdate;
      const birthdate = rawBirth
        ? rawBirth.toDate
          ? rawBirth.toDate()
          : new Date(rawBirth)
        : undefined;

      return {
        ...userData,
        id: userData.id,
        email: userData.email,
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        avatar: userData.avatar,
        bio: userData.bio,
        location: userData.location,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        balance: userData.balance || 0,
        videoCount,
        videos,
        followersList: userData.followersList || [],
        followerCount: userData.followerCount || 0,
        participationCount: userData.participationCount || 0,
        birthdate,
      };
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors de la récupération du profil : ' + error.message,
      );
    }
  }

  async followUser(currentUserId: string, targetUserId: string): Promise<void> {
    try {
      const currentUserRef = this.db.collection('users').doc(currentUserId);
      const targetUserRef = this.db.collection('users').doc(targetUserId);

      const [currentUserDoc, targetUserDoc] = await Promise.all([
        currentUserRef.get(),
        targetUserRef.get(),
      ]);

      if (!currentUserDoc.exists || !targetUserDoc.exists) {
        throw new BadRequestException(
          'Un ou plusieurs utilisateurs non trouvés.',
        );
      }

      const targetUserData = targetUserDoc.data() as User;

      if (currentUserId === targetUserId) {
        throw new BadRequestException(
          'Vous ne pouvez pas vous suivre vous-même.',
        );
      }

      if (targetUserData.followersList?.includes(currentUserId)) {
        throw new BadRequestException('Vous suivez déjà cet utilisateur.');
      }

      await targetUserRef.update({
        followersList: (targetUserData.followersList || []).concat(
          currentUserId,
        ),
        followerCount: (targetUserData.followerCount || 0) + 1,
      });

      console.log(
        `Utilisateur ${currentUserId} suit maintenant ${targetUserId}`,
      );
    } catch (error) {
      console.error('Erreur lors du suivi:', error);
      throw new BadRequestException('Erreur lors du suivi : ' + error.message);
    }
  }

  async unfollowUser(
    currentUserId: string,
    targetUserId: string,
  ): Promise<void> {
    try {
      const currentUserRef = this.db.collection('users').doc(currentUserId);
      const targetUserRef = this.db.collection('users').doc(targetUserId);

      const [currentUserDoc, targetUserDoc] = await Promise.all([
        currentUserRef.get(),
        targetUserRef.get(),
      ]);

      if (!currentUserDoc.exists || !targetUserDoc.exists) {
        throw new BadRequestException(
          'Un ou plusieurs utilisateurs non trouvés.',
        );
      }

      const targetUserData = targetUserDoc.data() as User;

      if (!targetUserData.followersList?.includes(currentUserId)) {
        throw new BadRequestException('Vous ne suivez pas cet utilisateur.');
      }

      await targetUserRef.update({
        followersList: (targetUserData.followersList || []).filter(
          (id) => id !== currentUserId,
        ),
        followerCount: (targetUserData.followerCount || 0) - 1,
      });

      console.log(`Utilisateur ${currentUserId} ne suit plus ${targetUserId}`);
    } catch (error) {
      console.error("Erreur lors de l'unfollow:", error);
      throw new BadRequestException(
        "Erreur lors de l'unfollow : " + error.message,
      );
    }
  }

  async googleLogin(googleLoginDto: GoogleLoginDto) {
    try {
      // Vérifier si l'utilisateur existe déjà avec cet email
      const snapshot = await this.db
        .collection('users')
        .where('email', '==', googleLoginDto.email)
        .get();

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data() as User;
        return {
          ...userData,
          id: snapshot.docs[0].id,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        };
      }
      return null;
    } catch (error) {
      console.error('Erreur recherche utilisateur:', error);
      return null;
    }
  }

  private async createUserFromGoogle(
    googleUser: any,
    googleLoginDto: GoogleLoginDto,
  ): Promise<User> {
    try {
      const newUser: User = {
        id: googleUser.uid,
        email: googleUser.email,
        role: UserRole.Listener, // Rôle par défaut
        firstName: googleLoginDto.displayName?.split(' ')[0] || '',
        lastName:
          googleLoginDto.displayName?.split(' ').slice(1).join(' ') || '',
        phoneNumber: '',
        avatar: googleLoginDto.photoURL || '',
        bio: '',
        location: '',
        latitude: 0,
        longitude: 0,
        createdAt: new Date(),
        videoCount: 0,
        participationCount: 0,
        followerCount: 0,
        balance: 0,
        followersList: [],
      };

      // Enregistrement dans Firestore
      await this.db.collection('users').doc(newUser.id).set(newUser);
      console.log('Utilisateur Google créé:', newUser.id);

      return newUser;
    } catch (error) {
      console.error('Erreur création utilisateur Google:', error);
      throw new BadRequestException(
        "Erreur lors de la création de l'utilisateur Google",
      );
    }
  }

  // Ajoutez cette méthode dans user.service.ts
  async getUserByIdPublic(userId: string): Promise<Partial<User>> {
    try {
      const userRef = this.db.collection('users').doc(userId);
      const doc = await userRef.get();
      console.log('Checking userId:', userId);
      console.log('Document exists?', doc.exists);
      if (!doc.exists) {
        throw new BadRequestException('Utilisateur non trouvézzzzzzzzz.');
      }

      const userData = doc.data() as User;

      return {
        id: userId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        avatar: userData.avatar,
        bio: userData.bio,
        location: userData.location,
        role: userData.role,
        followerCount: userData.followerCount || 0,
        videoCount: userData.videoCount || 0,
        participationCount: userData.participationCount || 0,
      };
    } catch (error) {
      throw new BadRequestException(
        "Erreur lors de la récupération de l'utilisateur : " + error.message,
      );
    }
  }

async getFollowersList(uid: string): Promise<Partial<User>[]> {
  try {
    const userRef = this.db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new BadRequestException('Utilisateur non trouvé.');
    }

    const userData = userDoc.data() as User;
    const followersList = userData.followersList || [];
    
    if (followersList.length === 0) {
      return [];
    }

    // Récupérer les détails de chaque follower
    const followersPromises = followersList.map(async (followerId) => {
      const followerRef = this.db.collection('users').doc(followerId);
      const followerDoc = await followerRef.get();
      
      if (followerDoc.exists) {
        const followerData = followerDoc.data() as User;
        return {
          id: followerId,
          firstName: followerData.firstName,
          lastName: followerData.lastName,
          avatar: followerData.avatar,
          bio: followerData.bio,
          location: followerData.location,
          role: followerData.role,
          followerCount: followerData.followerCount || 0,
          videoCount: followerData.videoCount || 0,
          participationCount: followerData.participationCount || 0,
        };
      }
      return null;
    });

    const followers = await Promise.all(followersPromises);
    return followers.filter(follower => follower !== null) as Partial<User>[];
  } catch (error) {
    throw new BadRequestException(
      'Erreur lors de la récupération des followers : ' + error.message,
    );
  }
}
  //     );
  //   }
  // }

  async getAllReciters(): Promise<Partial<User>[]> {
    try {
      console.log('[getAllReciters] Starting to fetch reciters from Firestore');
      
      const snapshot = await this.db
        .collection('users')
        .where('role', '==', 'Reciter')
        .get()
        .catch(error => {
          console.error('[getAllReciters] Error executing Firestore query:', error);
          throw new BadRequestException('Error fetching reciters: ' + error.message);
        });
      
      console.log(`[getAllReciters] Found ${snapshot.size} reciters in Firestore`);
      
      if (snapshot.empty) {
        console.warn('[getAllReciters] No reciters found in Firestore');
        return [];
      }

      const reciters: Partial<User>[] = [];
      
      // Process each document
      for (const doc of snapshot.docs) {
        try {
          const userData = doc.data();
          console.log(`[getAllReciters] Processing user ${doc.id}:`, userData);
          
          if (!userData) {
            console.warn(`[getAllReciters] Document ${doc.id} has no data`);
            continue;
          }
          
          // Create a clean user object with only the necessary fields
          const user: Partial<User> = {
            id: doc.id,
            email: userData.email || '',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            role: userData.role || 'User',
            avatar: userData.avatar || '',
            bio: userData.bio || '',
            location: userData.location || '',
            latitude: userData.latitude || 0,
            longitude: userData.longitude || 0,

            // Add other fields as needed
          };
          
          reciters.push(user);
          
        } catch (docError) {
          console.error(`[getAllReciters] Error processing document ${doc.id}:`, docError);
          // Continue with other documents even if one fails
        }
      }
      
      console.log(`[getAllReciters] Successfully processed ${reciters.length} reciters`);
      return reciters;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('[getAllReciters] Critical error:', {
        message: errorMessage,
        stack: error?.stack || 'No stack trace',
        timestamp: new Date().toISOString()
      });
      
      // If it's already a BadRequestException, rethrow it
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(`Error fetching reciters: ${errorMessage}`);
    }
  }
}
