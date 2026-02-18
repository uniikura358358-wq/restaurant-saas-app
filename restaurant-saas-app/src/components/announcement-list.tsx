"use client";

import React, { useState } from "react";
import { Bell, Info, X } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Announcement } from "@/types/firestore";

interface AnnouncementListProps {
    announcements?: Announcement[];
}

export function AnnouncementList({ announcements = [] }: AnnouncementListProps) {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = announcements.filter(a => !a.isRead).length;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button className="relative p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors focus:outline-none group">
                    <Bell className="size-5 group-hover:scale-110 transition-transform" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 size-2.5 bg-destructive border-2 border-background rounded-full" />
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 rounded-2xl shadow-xl border-border" align="end" side="top">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-black text-sm tracking-tight">お知らせ</h3>
                    <Badge variant="secondary" className="text-[10px] font-bold">新着 {unreadCount}件</Badge>
                </div>
                <ScrollArea className="h-[300px]">
                    {announcements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
                            <div className="bg-muted p-3 rounded-full mb-3 opacity-50">
                                <Bell className="size-6" />
                            </div>
                            <p className="text-xs font-medium">現在お知らせはありません</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {announcements.map((announcement) => (
                                <div
                                    key={announcement.id}
                                    className="p-4 hover:bg-muted/30 cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 p-1.5 bg-primary/10 rounded-lg">
                                            <Info className="size-3.5 text-primary" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-xs font-bold leading-tight line-clamp-2 gap-2 flex items-center">
                                                {announcement.title}
                                                {!announcement.isRead && <span className="size-1.5 rounded-full bg-primary" />}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                {announcement.content}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground/60 pt-1">
                                                {new Date(announcement.createdAt as Date).toLocaleDateString('ja-JP')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-3 bg-muted/20 border-t text-center">
                    <button className="text-[10px] font-bold text-primary hover:underline">
                        過去のお知らせをすべて見る
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
