const { pool } = require("../config/db");

async function initDatabase() {
    try {
        console.log("[db-init] Checking database schema...");

        // 1. Check & upgrade users table columns
        const [userCols] = await pool.query("SHOW COLUMNS FROM users");
        const userColNames = userCols.map(c => c.Field);

        if (!userColNames.includes("role")) {
            await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE'");
            console.log("[db-init] Added 'role' column to users.");
        }
        if (!userColNames.includes("status")) {
            await pool.query("ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'");
            console.log("[db-init] Added 'status' column to users.");
        }
        if (!userColNames.includes("profile_image")) {
            await pool.query("ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) NULL");
            console.log("[db-init] Added 'profile_image' column to users.");
        }
        if (!userColNames.includes("updated_at")) {
            await pool.query("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            console.log("[db-init] Added 'updated_at' column to users.");
        }

        // Ensure user 1 has role ADMIN
        await pool.query("UPDATE users SET role = 'ADMIN' WHERE id = 1");

        // 2. Check & upgrade documents table columns
        const [docCols] = await pool.query("SHOW COLUMNS FROM documents");
        const docColNames = docCols.map(c => c.Field);

        if (!docColNames.includes("version")) {
            await pool.query("ALTER TABLE documents ADD COLUMN version INT NOT NULL DEFAULT 1");
            console.log("[db-init] Added 'version' column to documents.");
        }
        if (!docColNames.includes("approval_status")) {
            await pool.query("ALTER TABLE documents ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'");
            console.log("[db-init] Added 'approval_status' column to documents.");
        }

        // 3. Document approvals table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS document_approvals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                document_id INT NOT NULL,
                submitted_by INT NOT NULL,
                reviewed_by INT NULL,
                status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
                comments TEXT NULL,
                rejection_reason TEXT NULL,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP NULL,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 4. Categories table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                color VARCHAR(30) DEFAULT '#2563eb',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 5. Tags table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tags (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 6. Document tags junction table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS document_tags (
                document_id INT NOT NULL,
                tag_id INT NOT NULL,
                PRIMARY KEY (document_id, tag_id),
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 7. Document shares
        await pool.query(`
            CREATE TABLE IF NOT EXISTS document_shares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                document_id INT NOT NULL,
                shared_by INT NOT NULL,
                shared_with INT NOT NULL,
                permission ENUM('VIEW', 'DOWNLOAD', 'EDIT') NOT NULL DEFAULT 'VIEW',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_doc_user (document_id, shared_with),
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 8. Document versions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS document_versions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                document_id INT NOT NULL,
                version_number INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                original_file_name VARCHAR(255) NOT NULL,
                mime_type VARCHAR(150),
                file_size BIGINT,
                comment TEXT,
                uploaded_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 9. Document comments
        await pool.query(`
            CREATE TABLE IF NOT EXISTS document_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                document_id INT NOT NULL,
                user_id INT NOT NULL,
                parent_id INT NULL,
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_id) REFERENCES document_comments(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 10. Activity logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                document_id INT NULL,
                user_id INT NOT NULL,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 11. Audit logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                user_email VARCHAR(190),
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50),
                entity_id INT NULL,
                ip_address VARCHAR(45),
                status VARCHAR(20) DEFAULT 'SUCCESS',
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 12. Seed default categories if empty
        const [catCount] = await pool.query("SELECT COUNT(*) as count FROM categories");
        if (catCount[0].count === 0) {
            const defaultCats = [
                ["General", "Standard general documents", "#2563eb"],
                ["Finance", "Financial records, invoices, statements", "#10b981"],
                ["Legal", "Contracts, terms, compliance filings", "#8b5cf6"],
                ["HR", "Employee forms, policies, resumes", "#f59e0b"],
                ["Technical", "Specs, architectures, engineering docs", "#06b6d4"],
                ["Marketing", "Assets, brand collateral, campaigns", "#ec4899"],
                ["Operations", "Standard operating procedures, checklists", "#64748b"]
            ];
            for (const [name, desc, color] of defaultCats) {
                await pool.query("INSERT IGNORE INTO categories (name, description, color) VALUES (?, ?, ?)", [name, desc, color]);
            }
            console.log("[db-init] Seeded standard categories.");
        }

        console.log("[db-init] Database schema is ready.");
    } catch (err) {
        console.error("[db-init] Error initializing database schema:", err.message);
    }
}

module.exports = { initDatabase };
