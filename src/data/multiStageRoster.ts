import { Student, Teacher, Halaqah, DailySessionRecord, User } from '../types';
import { RAW_BARAEM_STUDENTS, AL_FURQAN_STUDENTS, AL_FURQAN_SESSION_RECORDS } from './studentsRoster';

// ============================================================================
// COMPLETE MULTI-STAGE HALAQAHS (Every single Halaqah is strictly linked to stageId)
// ============================================================================

export const COMPREHENSIVE_HALAQAHS: Halaqah[] = [];

// ============================================================================
// COMPREHENSIVE TEACHERS (Linked with halaqahs and tenants)
// ============================================================================

export const COMPREHENSIVE_TEACHERS: Teacher[] = [];

// ============================================================================
// SYSTEM AND TEACHER USER ACCOUNTS
// ============================================================================

export const COMPREHENSIVE_USERS: User[] = [];

// ============================================================================
// REAL STUDENTS FOR ASHBAL 2, FITYAN 1 & 2, SHABAB 1 & 2
// ============================================================================

export const ADDITIONAL_STAGE_STUDENTS: Student[] = [];

// ============================================================================
// ALL CONSOLIDATED STUDENTS (Ghazzawi + Furqan across all 4 stages)
// ============================================================================

export const ALL_COMPREHENSIVE_STUDENTS: Student[] = [];

// Sample daily session records for testing in all stages
export const COMPREHENSIVE_SESSION_RECORDS: DailySessionRecord[] = [];
