# CODEX.md
# AI Deployment Architecture

The AI model is deployed separately from the web application.

## Architecture

Next.js Frontend
        │
        ▼
Next.js Backend (API Routes)
        │
        ▼
Hugging Face Space (TensorFlow Model)
        │
        ▼
Returns Predictions + Grad-CAM
        │
        ▼
Next.js generates reports and stores data

---

## Responsibilities

### Hugging Face Space

The Hugging Face Space is responsible ONLY for AI inference.

Responsibilities:

- Load the trained TensorFlow DenseNet121 model
- Accept Chest X-ray images
- Preprocess images
- Run inference
- Generate Grad-CAM visualization
- Return prediction probabilities
- Return confidence scores
- Return inference time

The Hugging Face Space must NOT:

- Store patients
- Authenticate users
- Generate PDFs
- Manage reports
- Connect to the database

---

### Next.js Application

The Next.js application is responsible for:

- Authentication
- Patient management
- Upload interface
- Calling the Hugging Face API
- Displaying AI predictions
- Displaying Grad-CAM
- Generating AI reports
- Exporting PDFs
- Saving patient records
- Dashboard
- Analytics
- Settings

---

## AI Communication

The frontend should never load the TensorFlow model directly.

Always communicate through the Hugging Face API.

The TensorFlow model should remain isolated inside the Hugging Face Space.

---

## Model

Model File

best_densenet121.keras

Framework

TensorFlow

Deployment

Hugging Face Spaces

Inference Only

No Training

No Fine-Tuning

No Model Updates

---

## Expected AI Response

The Hugging Face API should return a structured JSON response.

Example:

{
    "predictions": [
        {
            "disease": "Lung Opacity",
            "confidence": 0.94
        },
        {
            "disease": "Pleural Effusion",
            "confidence": 0.81
        }
    ],
    "gradcam": "<base64-image>",
    "inference_time": 0.82
}

The Next.js application is responsible for converting this response into a professional medical report.

# AI Lung Abnormality Detection System

## Project Overview

This project is an AI-powered web application that assists healthcare professionals in detecting lung abnormalities from Chest X-ray images.

The AI model has already been trained using **DenseNet121** on the **CheXpert Small** dataset and should be treated as a black-box inference engine.

The objective is to build a modern, production-quality web application around the trained model. The application should provide an intuitive interface for doctors to upload X-rays, view AI predictions, generate reports, and manage patient records.

This project is developed as an MCA Final Year Project and should resemble real hospital software rather than a simple academic demonstration.

---

# Primary Objective

Build a professional medical web application that allows users to:

- Authenticate securely
- Manage patients
- Upload Chest X-rays
- Run AI inference
- View disease predictions
- Display confidence scores
- View Grad-CAM visualization
- Generate AI-assisted reports
- Export reports
- Maintain patient history

The AI model already exists.

DO NOT retrain the model.

Only perform inference.

---

# Technology Stack

## Frontend

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- React Hook Form
- Zod
- Recharts

## Backend

- Next.js Route Handlers
- Server Actions where appropriate

## Database

- PostgreSQL
- Prisma ORM

## Authentication

Custom Authentication

- JWT
- HTTP-only Cookies
- bcrypt Password Hashing
- Role-Based Access Control

No Clerk.

No Auth0.

No Firebase Authentication.

---

# AI Model

Model

DenseNet121

Framework

TensorFlow

Dataset

CheXpert Small

Task

Multi-label Chest X-ray Classification

Number of Classes

14

Input Size

224 × 224 RGB

Output

14 Sigmoid Probabilities

Threshold

0.50

Disease Labels

- No Finding
- Enlarged Cardiomediastinum
- Cardiomegaly
- Lung Opacity
- Lung Lesion
- Edema
- Consolidation
- Pneumonia
- Atelectasis
- Pneumothorax
- Pleural Effusion
- Pleural Other
- Fracture
- Support Devices

---

# User Roles

## Admin

Permissions

- Manage doctors
- Manage patients
- View analytics
- Configure system settings
- Generate reports

---

## Doctor

Permissions

- Login
- Manage patients
- Upload Chest X-rays
- Run AI predictions
- View Grad-CAM
- Generate AI reports
- Export reports
- View patient history

---

# Application Pages

## Public Pages

/

Landing Page

/login

/register

/forgot-password

---

## Dashboard

/dashboard

Overview

- Statistics
- Recent Activity
- Quick Actions

---

## Patients

/dashboard/patients

Patient List

Search

Pagination

Filters

Sorting

---

/dashboard/patients/new

Add Patient

---

/dashboard/patients/[id]

Patient Details

Medical History

Previous Reports

Uploaded Images

---

## AI Prediction

/dashboard/predict

Upload Chest X-ray

Preview Image

Run AI Prediction

Display Results

Grad-CAM

Confidence Scores

---

## Reports

/dashboard/reports

View Reports

Search

Download PDF

Print

---

## Settings

/dashboard/settings

Hospital Information

AI Threshold

Doctor Signature

Theme

Notifications

---

# Dashboard Widgets

- Total Patients
- Today's Predictions
- Reports Generated
- AI Usage
- Recent Uploads

Charts

- Disease Distribution
- Monthly Predictions
- Daily Uploads

---

# Upload Requirements

Supported Formats

- PNG
- JPG
- JPEG

Maximum File Size

20 MB

Image Preview Required

Drag & Drop Upload

---

# AI Prediction Screen

Display

Original X-ray

Disease Probability Table

Confidence Score

Severity

Prediction Time

Grad-CAM Visualization

Inference Status

Recommendations

---

# AI Report

Professional Medical Report

Sections

- Patient Information
- Uploaded Image
- AI Findings
- Confidence Scores
- Severity
- Recommendations
- Disclaimer
- Doctor Notes

Export

- PDF

---

# Database Tables

## users

- id
- name
- email
- password
- role
- hospital
- phone
- createdAt
- updatedAt

---

## patients

- id
- patientId
- name
- age
- gender
- bloodGroup
- phone
- address
- notes
- createdAt

---

## scans

- id
- patientId
- imagePath
- gradcamImage
- predictionJson
- report
- createdAt

---

## reports

- id
- scanId
- doctorId
- pdfPath
- createdAt

---

# Folder Structure

src/

app/

components/

features/

hooks/

lib/

services/

actions/

types/

utils/

prisma/

middleware.ts

---

# Component Guidelines

Create reusable components.

Examples

- Sidebar
- Navbar
- PageHeader
- PatientCard
- StatsCard
- UploadCard
- PredictionTable
- DiseaseBadge
- SeverityBadge
- ProbabilityBar
- HeatmapViewer
- ReportCard
- LoadingSkeleton
- EmptyState
- ErrorState

---

# Design System

Style

- Clean
- Modern
- Medical
- Professional
- Minimal

Avoid

- Neon Colors
- Glassmorphism
- Gaming UI
- Excessive Animations

Use

- White Cards
- Soft Shadows
- Rounded Corners
- Large Spacing
- Consistent Typography

---

# Color Palette

Primary

#2563EB

Secondary

#0F172A

Success

#16A34A

Warning

#F59E0B

Danger

#DC2626

Background

#F8FAFC

Sidebar

#FFFFFF

Card

#FFFFFF

---

# Authentication Flow

Login

↓

Validate User

↓

Compare Password using bcrypt

↓

Generate JWT

↓

Store JWT in HTTP-only Cookie

↓

Redirect to Dashboard

Protect all dashboard routes using middleware.

---

# API Routes

/api/auth/login

/api/auth/register

/api/auth/logout

/api/patients

/api/predict

/api/reports

/api/dashboard

/api/settings

All responses should be strongly typed.

---

# Forms

Use

- React Hook Form
- Zod Validation

Requirements

- Inline Validation
- Helpful Error Messages
- Accessible Inputs

---

# Accessibility

- Keyboard Navigation
- ARIA Labels
- Focus States
- Screen Reader Support

---

# Performance

- Server Components where appropriate
- Lazy Loading
- Suspense
- Image Optimization
- Minimize Re-renders

---

# Error Handling

Provide graceful handling for:

- Network Errors
- Upload Failures
- AI Prediction Failures
- Authentication Errors
- Database Errors

Display friendly messages instead of raw exceptions.

---

# Security

- HTTP-only Cookies
- bcrypt Password Hashing
- JWT Authentication
- Role-Based Authorization
- Input Validation
- Secure File Uploads
- Protected Routes

---

# Coding Standards

- Use TypeScript everywhere
- Never use "any"
- Keep components small
- Reuse components
- Prefer composition over duplication
- Use descriptive names
- Write clean, maintainable code
- Follow Next.js best practices

---

# Future Enhancements

- DICOM Support
- PACS Integration
- Multi-language Support
- Multiple AI Models
- Appointment Scheduling
- FHIR Integration
- Mobile Application

---

# Important Rules

- Never retrain the AI model.
- Never modify model weights.
- Treat the AI model as an inference service only.
- Build reusable and maintainable components.
- Prioritize accessibility.
- Follow modern React and Next.js patterns.
- Create a professional medical application suitable for demonstration and future expansion.