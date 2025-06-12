const { db } = require('../database');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

class UserService {
  constructor() {
    this.saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
  }

  // Get all users
  async getAllUsers() {
    try {
      const result = await db.query('SELECT * FROM users');
      return result.rows;
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  // Get user by username
  async getUserByUsername(username) {
    try {
      const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting user by username:', error);
      throw error;
    }
  }

  // Get all emails
  async getAllEmails() {
    try {
      const result = await db.query('SELECT email FROM users');
      const emails = result.rows.map(row => row.email);
      return emails.filter((email, index, self) => self.indexOf(email) === index);
    } catch (error) {
      logger.error('Error getting all emails:', error);
      throw error;
    }
  }

  // Create new user
  async createUser(username, email, password) {
    try {
      // Check if user already exists
      const existingUser = await db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
      if (existingUser.rows.length > 0) {
        throw new Error('Username or email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);

      // Insert user
      const result = await db.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
        [username, email, hashedPassword]
      );

      return { id: result.rows[0].id, username, email };
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  async updateUser(id, updateFields) {
    try {
      // Hash password if provided
      if (updateFields.password) {
        updateFields.password = await bcrypt.hash(String(updateFields.password), this.saltRounds);
      }
      if (updateFields.passwordHash) {
        updateFields.password = await bcrypt.hash(String(updateFields.passwordHash), this.saltRounds);
        delete updateFields.passwordHash;
      }
      if (updateFields.password_hash) {
        updateFields.password = await bcrypt.hash(String(updateFields.password_hash), this.saltRounds);
        delete updateFields.password_hash;
      }

      const fields = Object.keys(updateFields);
      const values = Object.values(updateFields);
      
      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      const sql = `UPDATE users SET ${setClause} WHERE id = $${fields.length + 1}`;
      values.push(id);

      const result = await db.query(sql, values);
      
      if (result.rowCount === 0) {
        throw new Error('User not found or no changes made');
      }

      return { changes: result.rowCount };
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  async deleteUser(id) {
    try {
      const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      return { changes: result.rowCount };
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(username, oldPassword, newPassword) {
    try {
      const user = await this.getUserByUsername(username);
      if (!user) {
        throw new Error('User not found');
      }

      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isOldPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, this.saltRounds);
      
      await db.query(
        'UPDATE users SET password = $1 WHERE username = $2', 
        [hashedNewPassword, username]
      );

      return { success: true };
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  // Change username
  async changeUsername(oldUsername, newUsername, password) {
    try {
      const user = await this.getUserByUsername(oldUsername);
      if (!user) {
        throw new Error('User not found');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Password is incorrect');
      }

      // Check if new username already exists
      const existingUser = await this.getUserByUsername(newUsername);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      await db.query(
        'UPDATE users SET username = $1 WHERE username = $2', 
        [newUsername, oldUsername]
      );

      return { success: true };
    } catch (error) {
      logger.error('Error changing username:', error);
      throw error;
    }
  }

  // Change email
  async changeEmail(username, newEmail, password) {
    try {
      const user = await this.getUserByUsername(username);
      if (!user) {
        throw new Error('User not found');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Password is incorrect');
      }

      await db.query(
        'UPDATE users SET email = $1 WHERE username = $2', 
        [newEmail, username]
      );

      return { success: true };
    } catch (error) {
      logger.error('Error changing email:', error);
      throw error;
    }
  }

  // Delete account
  async deleteAccount(username, password) {
    try {
      const user = await this.getUserByUsername(username);
      if (!user) {
        throw new Error('User not found');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Password is incorrect');
      }

      await db.query('DELETE FROM users WHERE username = $1', [username]);

      return { success: true };
    } catch (error) {
      logger.error('Error deleting account:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
