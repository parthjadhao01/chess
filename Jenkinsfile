pipeline {
    agent any

    tools {
        nodejs "NodeJS"   // Name you gave in Jenkins tool config
    }

    stages {

        stage('Install pnpm') {
            steps {
                sh 'npm install -g pnpm'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'pnpm install'
            }
        }

        stage('Generate Prisma Client') {
            steps {
                sh 'pnpm --filter @repo/db run db:generate'
            }
        }

        stage('Build') {
            steps {
                sh 'pnpm build'
            }
        }
    }
}