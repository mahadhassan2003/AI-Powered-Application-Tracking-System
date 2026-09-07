'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { 
  User, Mail, Shield, Key, CheckCircle2, Edit3, Briefcase
} from 'lucide-react';

export default function CandidateProfilePage() {
  const user = useAuthStore(state => state.user);

  return (
    <div className="py-6 md:py-12 px-4 md:px-6 w-full">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">My Profile</h1>
        <p className="text-zinc-500 text-sm">Manage your personal information and account settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card className="bg-white dark:bg-zinc-900">
            <CardContent className="p-6 text-center">
              {/* Avatar */}
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
                <span className="text-2xl font-black text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || 'C'}
                </span>
              </div>
              <h3 className="text-lg font-bold">{user?.name || 'Candidate'}</h3>
              <p className="text-sm text-zinc-500 mt-1">{user?.email || 'No email set'}</p>

              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
                  <Shield className="w-3 h-3" />
                  <span>Account Active</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card className="bg-white dark:bg-zinc-900 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" /> Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">Two-Factor Auth</p>
                  <p className="text-[10px] text-zinc-400">Not enabled</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs" disabled>
                  Coming Soon
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">Password</p>
                  <p className="text-[10px] text-zinc-400">Last changed: Unknown</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs" disabled>
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Editable Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-zinc-900">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" /> Personal Information
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">Full Name</Label>
                  <Input value={user?.name || ''} readOnly className="bg-zinc-50 dark:bg-zinc-800/50" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">Email Address</Label>
                  <Input value={user?.email || ''} readOnly className="bg-zinc-50 dark:bg-zinc-800/50" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">Account Role</Label>
                  <Input value={user?.role || 'candidate'} readOnly className="bg-zinc-50 dark:bg-zinc-800/50 capitalize" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">Member Since</Label>
                  <Input value="Member" readOnly className="bg-zinc-50 dark:bg-zinc-800/50" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Career Preferences */}
          <Card className="bg-white dark:bg-zinc-900">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" /> Career Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">Preferred Role</Label>
                  <Input placeholder="e.g. Senior Software Engineer" className="bg-zinc-50 dark:bg-zinc-800/50" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">Preferred Location</Label>
                  <Input placeholder="e.g. Remote, San Francisco" className="bg-zinc-50 dark:bg-zinc-800/50" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">Expected Salary</Label>
                  <Input placeholder="e.g. $120,000 - $150,000" className="bg-zinc-50 dark:bg-zinc-800/50" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">Years of Experience</Label>
                  <Input placeholder="e.g. 5+" className="bg-zinc-50 dark:bg-zinc-800/50" />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Save Preferences (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resume Management */}
          <Card className="bg-white dark:bg-zinc-900">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-500" /> Resume & Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl p-8 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                <Edit3 className="w-8 h-8 mx-auto text-zinc-300 mb-3" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Upload a new master resume
                </p>
                <p className="text-xs text-zinc-400 mt-1">PDF or DOCX, max 10MB</p>
                <Button variant="outline" size="sm" className="mt-4" disabled>
                  Upload Resume (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
