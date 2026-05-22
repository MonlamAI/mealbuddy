'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type Language = 'en' | 'bo';

const translations = {
  en: {
    app_title: 'MealBuddy',
    home: 'Home',
    dashboard: 'Dashboard',
    sign_in: 'Sign In',
    sign_up: 'Sign Up',
    logout: 'Logout',
    vote_now: 'Vote Now',
    join_team: 'Join your team',
    hero_title: 'Lunch at work',
    hero_subtitle: 'The smartest way for teams to vote on meals, and eliminate food waste.',
    weekly_menu_title: 'This Week’s Lunch Plan',
    weekly_menu_subtitle: 'Fresh meals prepared daily by our expert chefs. Vote before 4 PM to join!',
    how_it_works: 'How MealBuddy Works',
    how_step1_title: 'MasterChef Plans Menu',
    how_step1_desc: 'Daily chef-curated meals are added to the weekly dashboard.',
    how_step2_title: 'Employees Vote',
    how_step2_desc: 'Team members confirm their lunch before the 10 AM cutoff.',
    how_step3_title: 'Cook Smart',
    how_step3_desc: 'Chef prepares exactly what is needed. Zero waste.',
    cta_title: "Ready to join your team's lunch hour?",
    cta_desc: 'Join your office workspace today and never wonder "what\'s for lunch" again.',
    cta_button: 'Get Started Now',
    footer_rights: '© 2026 MealBuddy. All rights reserved.',

    // Login / Sign Up Page
    welcome_back: 'Welcome Back',
    get_started: 'Get Started',
    login_subtitle: "Sign in to manage your team's lunch schedule.",
    signup_subtitle: 'Create an account to simplify your office dining experience.',
    email_address: 'Email Address',
    password: 'Password',
    confirm_password: 'Confirm Password',
    full_name: 'Full Name',
    work_email: 'Work Email',
    create_account: 'Create Free Account',
    terms_info: 'By continuing, you agree to our Terms of Service.',
    back_to_website: 'Back to Website',
    forgot_password: 'Forgot Password?',
    role_employee: 'Employee',
    role_chef: 'Chef',
    role_accountant: 'Accountant',

    // User Dashboard
    greeting: 'Hey',
    user_dashboard_desc: "Track your meals and see what's cooking next.",
    todays_lunch: "Today's Lunch",
    tomorrows_menu: "Tomorrow's Menu",
    cutoff_passed: '10 AM Cutoff passed',
    voting_closed: 'Voting for today is closed. Check back tomorrow morning!',
    im_joining: "I'm Joining",
    skip_today: 'Skip Today',
    total_meals_eaten: 'Total Meals Eaten',
    since_joined: 'Since you joined MealBuddy',
    current_month: 'Current Month',
    days_tracked: 'Total working days tracked',
    monthly_summary: 'Monthly Summary',
    joined: 'Joined',
    skipped: 'Skipped',
    recent_activity: 'Recent Activity',
    view_all: 'View All',
    no_recent_activity: 'No recent activity.',
    notifications: 'Notifications',
    no_notifications: 'No recent notifications',
    new_badge: 'New',
    setting_table: 'Setting the table...',
    sizzling_data: 'Sizzling the data...',

    // Vote Page
    will_you_join: 'Will you join us?',
    vote_yes: "Yes, I'll be there",
    vote_no: 'No, skip today',
    voting_locked: 'Voting is now locked',
    response_cutoff: 'Response required by 4:00 PM',
    vote_recorded: 'Vote recorded successfully',
    team_participation: 'Team Participation',
    joined_so_far: 'joined so far',
    todays_special: "Today's Special",
    lunch_at_work: 'Lunch at work',
    confirm_attendance_for: 'Confirm your attendance for',
    meal_details_info: 'Meal includes steamed rice, cucumber raita, and seasonal dessert. All ingredients are locally sourced.',
    voting_deadline: 'Voting Deadline',
    closed: 'Closed',
    chef_broadcast_info: '{time} • Chef {name}',
    shahi_paneer_rice: 'Shahi Paneer with Jeera Rice',
    shahi_paneer_desc: 'A rich, creamy north-Indian curry paired with aromatic basmati rice and fresh cucumber salad.',
    fallback_menu_date: 'Tuesday, May 13th',

    // Chef Dashboard
    chef_greeting: 'Good Morning, Chef',
    total_employees: 'Total Employees',
    joined_lunch: 'Joined Lunch',
    skipped_lunch: 'Skipped Lunch',
    participation_rate: 'Participation Rate',
    prep_timeline: 'Prep Timeline',
    total_plates_needed: 'Total Plates Needed',
    response_cutoff_time: '10:00 AM',
    response_cutoff_label: 'Response Cutoff',
    edit_weekly_menu: 'Edit Weekly Menu',
    quick_actions: 'Quick Actions',
    broadcast: 'Broadcast',
    csv_export: 'CSV Export',
    participation_details: 'Participation Details',
    all_filter: 'All',
    waiting_filter: 'Waiting',
    search_placeholder: 'Search by employee name...',
    weekly_joining: 'Weekly Joining',
    weekly_joining_desc: 'Participation over the last 5 days',
    no_responses_yet: 'No responses yet',
    no_responses_desc: "Waiting for employees to cast their votes for today's lunch.",
    voted_at: 'Voted at {time}',

    // Weekly Menu Modal
    edit_weekly_menu_title: 'Edit Weekly Menu',
    target_day: 'Target Day',
    dish_photo: 'Dish Photo',
    dish_photo_upload_desc: 'Click to upload food image',
    dish_photo_specs: 'PNG, JPG up to 5MB',
    dish_name: 'Dish Name',
    save_changes: 'Save Changes',

    // Broadcast Modal
    send_broadcast: 'Send Broadcast',
    message_to_users: 'Message to Users',
    broadcast_placeholder: 'e.g. Lunch is delayed by 15 mins today!',

    // Billing Panels
    billing_payment: 'Billing & Payment',
    billing_period: 'Billing Period',
    amount_due: 'Amount Due',
    plate_cost: 'Plate Cost',
    status: 'Status',
    paid: 'Paid',
    unpaid: 'Unpaid',

    // Weekdays
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',

    // Weekdays Short
    Mon: 'Mon',
    Tue: 'Tue',
    Wed: 'Wed',
    Thu: 'Thu',
    Fri: 'Fri',

    // Additional Vote Page Keys
    unread_new: '{count} New',
    mark_as_read: 'Mark as read',
    voting_deadline_timer: 'Voting Deadline: {time}',
    vote_submitted: 'Vote recorded successfully',

    // Additional Billing Keys
    monthly_lunch_billing: 'Monthly Lunch Billing',
    meals_joined: 'Meals Joined',
    cost_per_plate: 'Cost Per Plate',
    total_due: 'Total Due',
    no_billing_this_month: 'No billing for this month yet',
    chef_upload_info: 'Your chef will upload the monthly bill when ready.',
    accountant_upload_info: 'Your accountant will upload the monthly bill when ready.',
    billing_history: 'Billing History',
    no_previous_billing: 'No previous billing records.',
    meals_joined_count: '{count} meals joined',
    loading_billing: 'Loading billing...',

    // Chef Billing Keys

    total_bill: 'Total Bill',
    total_plates: 'Total Plates',
    per_plate_cost: 'Per Plate Cost',
    paid_users: 'Paid Users',
    unpaid_users: 'Unpaid Users',
    bill_receipt: 'Bill Receipt — {period}',
    user_billing: 'User Billing — {period}',
    upload_bill: 'Upload Bill — {period}',
    no_bill_exists: 'No bill exists for this period. Enter the total cafeteria bill — joined plates are counted automatically.',
    total_bill_amount: 'Total Bill Amount (₹)',
    notes_optional: 'Notes (optional)',
    generate_monthly_bill: 'Generate Monthly Bill',
    drag_drop_bill_image: 'Drag & drop bill image or click to upload',
    drag_drop_specs: 'PNG, JPG, WebP up to 5MB',
    search_users: 'Search users...',
    user_column: 'User',
    joined_column: 'Joined',
    amount_due_column: 'Amount Due',
    status_column: 'Status',
    paid_at_column: 'Paid At',
    action_column: 'Action',
    mark_unpaid: 'Mark Unpaid',
    mark_paid: 'Mark Paid',
    no_matching_users: 'No matching users',
    page_indicator: 'Page {page} of {totalPages} ({count} users)',

    // Dish Name Mappings
    'Chicken Curry Rice': 'Chicken Curry Rice',
    'Shahi Paneer Rice': 'Shahi Paneer Rice',
    'Shahi Paneer with Jeera Rice': 'Shahi Paneer with Jeera Rice',
    'Red Bean Rice Curd': 'Red Bean Rice Curd',
    'Aloo Phinksha Tingmo': 'Aloo Phinksha Tingmo',
    'Egg Chowmein': 'Egg Chowmein',

    // Description Mappings
    chicken_curry_desc: 'A delicious, spiced chicken curry slow-cooked with aromatic herbs, served with fluffy basmati rice.',
    red_bean_desc: 'Comforting red kidney beans (rajma) cooked in a rich tomato gravy, served with rice and fresh curd.',
    aloo_phinksha_desc: 'A traditional Tibetan stew made with potatoes, glass noodles (phing), and wood-ear mushrooms, served with steamed bun (tingmo).',
    egg_chowmein_desc: 'Wok-tossed stir-fried noodles with fresh vegetables and scrambled eggs, seasoned with savory sauces.',
    chefs_special: "Chef's special for the day.",
    menu_not_set: 'Menu not set',
    chef_not_decided: "Chef hasn't decided yet.",
  },
  bo: {
    app_title: 'ཞལ་ལག་མཛའ་མཐུན།',
    home: 'གཙོ་ངོས།',
    dashboard: 'ལས་དོན་པང་ལེབ།',
    sign_in: 'ནང་དུ་འཛུལ་བ།',
    sign_up: 'ཐོ་འགོད་བྱེད་པ།',
    logout: 'ཕྱིར་ཐོན་པ།',
    vote_now: 'འདེམས་ཤོག་འཕེན་པ།',
    join_team: 'རུ་ཁག་ལ་མཉམ་ཞུགས།',
    hero_title: 'ལས་ཡུལ་གྱི་ཉིན་ཟས།',
    hero_subtitle: 'རུ་ཁག་གིས་ཉིན་ཟས་ལ་འདེམས་ཤོག་འཕེན་པ་དང་ཟས་ལྷག་ཆུད་ཟོས་སྔོན་འགོག་བྱེད་པའི་ཐབས་ལམ་མཆོག',
    weekly_menu_title: 'འདི་བདུན་ཕྲག་གི་ཟས་ཐོ།',
    weekly_menu_subtitle: 'ང་ཚོའི་ཆེད་ལས་མ་ཆེན་གྱིས་ཉིན་ལྟར་གྲ་སྒྲིག་བྱས་པའི་ཟས་གསར་པ། ཕྱི་དྲོ་ཆུ་ཚོད་ ༤ སྔོན་ལ་འདེམས་དགོས།',
    how_it_works: 'ཞལ་ལག་མཛའ་མཐུན་ཇི་ལྟར་བཀོལ་དགོས།',
    how_step1_title: 'མ་ཆེན་གྱིས་ཟས་ཐོ་འཆར་གཞི་བཟོ་བ།',
    how_step1_desc: 'ཉིན་རེའི་ཟས་མཆོག་རྣམས་བདུན་རེའི་ཟས་ཐོའི་ནང་དུ་བཀོད་སྒྲིག་བྱེད།',
    how_step2_title: 'ལས་བཟོས་འདེམས་ཤོག་འཕེན་པ།',
    how_step2_desc: 'རུ་ཁག་གི་ཚོགས་མི་ཚོས་ཞོགས་པ་ཆུ་ཚོད་ ༡༠ སྔོན་ལ་ཉིན་ཟས་བཞེས་མིན་ཐག་གཅོད་བྱེད།',
    how_step3_title: 'ཚོད་རྩིས་བག་ཡོད་ངང་གཡོ་སྐོལ་བྱེད་པ།',
    how_step3_desc: 'མ་ཆེན་གྱིས་གསོལ་ཚིགས་དགོས་ངེས་གང་ཡིན་པ་དེ་གཡོ་སྐོལ་བྱེད་པས་ཆུད་ཟོས་མི་འགྲོ།',
    cta_title: 'རུ་ཁག་གི་ཉིན་ཟས་དུས་ཚོད་ལ་མཉམ་ཞུགས་གནང་གི་ཡིན་པས།',
    cta_desc: 'དེ་རིང་ཉིད་དུ་ཡིག་ཚང་གི་ལས་ཡུལ་དུ་མཉམ་ཞུགས་གནང་ནས་ཉིན་ཟས་ཅི་བཞེས་ལ་ཐེ་ཚོམ་བྱེད་མི་དགོས།',
    cta_button: 'ད་ལྟ་ཉིད་དུ་འགོ་འཛུགས་པ།',
    footer_rights: '© ༢༠༢༦ ཞལ་ལག་མཛའ་མཐུན། ཐོབ་ཐང་ཡོངས་རྫོགས་ཡོད།',

    // Login / Sign Up Page
    welcome_back: 'ཡོང་བར་དགའ་བསུ་ཞུ།',
    get_started: 'འགོ་འཛུགས་པ།',
    login_subtitle: 'རུ་ཁག་གི་ཉིན་ཟས་འཆར་གཞི་བཀོད་སྒྲིག་བྱེད་པར་ནང་དུ་འཛུལ་བ།',
    signup_subtitle: 'ཁྱེད་ཀྱི་ཡིག་ཚང་གི་ཉིན་ཟས་བདེ་བླག་ངང་བཀོད་སྒྲིག་བྱེད་པར་ཐོ་འགོད་བྱེད་པ།',
    email_address: 'གློག་འཕྲིན་ཁ་བྱང་།',
    password: 'གསང་ཚིག',
    confirm_password: 'གསང་ཚིག་བསྐྱར་འཇུག',
    full_name: 'མིང་ཆ་ཚང་།',
    work_email: 'ལས་ཀའི་གློག་འཕྲིན།',
    create_account: 'རིན་མེད་ཐོ་འགོད་བྱེད་པ།',
    terms_info: 'མུ་མཐུད་ན། ཁྱེད་ཀྱིས་ང་ཚོའི་ཞབས་ཞུའི་གན་རྒྱར་མོས་མཐུན་ཡོད་པར་བརྩི།',
    back_to_website: 'ཕྱིར་དྲ་ཚིགས་ལ་ལོག་པ།',
    forgot_password: 'གསང་ཚིག་བརྗེད་སོང་ངམ།',
    role_employee: 'ལས་བཟོ་བ།',
    role_chef: 'མ་ཆེན་ལགས།',
    role_accountant: 'རྩིས་པ་ལགས།',

    // User Dashboard
    greeting: 'བཀྲ་ཤིས་བདེ་ལེགས།',
    user_dashboard_desc: 'ཁྱེད་ཀྱི་ཉིན་ཟས་ལ་བརྩི་ཞིབ་དང་ཟས་ཐོ་གང་ཡིན་ལྟ་བ།',
    todays_lunch: 'དེ་རིང་གི་ཉིན་ཟས།',
    tomorrows_menu: 'སང་ཉིན་གྱི་ཟས་ཐོ།',
    cutoff_passed: 'ཞོགས་པ་ཆུ་ཚོད་ ༡༠ པའི་དུས་བཅད་ཡོལ་ཟིན།',
    voting_closed: 'དེ་རིང་གི་འདེམས་ཤོག་འཕེན་མཚམས་བཅད་ཟིན། སང་ཉིན་ཞོགས་པར་ཕེབས་རོགས།',
    im_joining: 'ང་ཡོང་གི་ཡིན།',
    skip_today: 'དེ་རིང་མི་ཡོང་།',
    total_meals_eaten: 'ཞལ་ལག་བཞེས་པའི་ཐེངས་གྲངས།',
    since_joined: 'ཁྱེད་རང་མཉམ་ཞུགས་བྱས་པ་ནས་བཟུང་།',
    current_month: 'འདི་ཟླའི་ནང་།',
    days_tracked: 'ཉིན་ཟས་བརྩི་ཞིབ་བྱས་པའི་ཉིན་གྲངས།',
    monthly_summary: 'ཟླ་རེའི་ཕྱོགས་བསྡོམས།',
    joined: 'མཉམ་ཞུགས།',
    skipped: 'མི་བཞེས།',
    recent_activity: 'ཉེ་བའི་ལས་དོན།',
    view_all: 'ཡོངས་རྫོགས།',
    no_recent_activity: 'ཉེ་བའི་ལས་དོན་མི་འདུག',
    notifications: 'བརྡ་ཐོ།',
    no_notifications: 'བརྡ་ཐོ་གསར་པ་མི་འདུག',
    new_badge: 'གསར་པ།',
    setting_table: 'སྒྲོག་ཙེ་སྒྲིག་བཞིན་པ།...',
    sizzling_data: 'གནས་ཚུལ་རྣམས་བསྒྲིགས་བཞིན་པ།...',

    // Vote Page
    will_you_join: 'ཁྱེད་རང་མཉམ་ཞུགས་གནང་གི་ཡིན་པས།',
    vote_yes: 'ཡིན། ང་ཡོང་གི་ཡིན།',
    vote_no: 'མིན། དེ་རིང་མི་ཡོང་།',
    voting_locked: 'འདེམས་ཤོག་འཕེན་མཚམས་བཅད་ཟིན།',
    response_cutoff: 'ཕྱི་དྲོ་ཆུ་ཚོད་ ༤ སྔོན་ལ་ཐག་གཅོད་གནང་དགོས།',
    vote_recorded: 'འདེམས་ཤོག་ལམ་ལྷོང་ངང་འཁོད་སོང་།',
    team_participation: 'རུ་ཁག་གི་མཉམ་ཞུགས་ཚད།',
    joined_so_far: 'མཉམ་ཞུགས་བྱས་ཟིན།',
    todays_special: 'དེ་རིང་གི་ཟས་མཆོག',
    lunch_at_work: 'ལས་ཡུལ་གྱི་ཉིན་ཟས།',
    confirm_attendance_for: 'ཉིན་ཟས་བཞེས་མིན་ཐག་གཅོད་བྱེད་པ།',
    meal_details_info: 'ཞལ་ལག་ནང་དུ་འབྲས་དང་། ཀུ་ཀུམ་བར་ར་ཡེ་ཏ། དུས་ཚིགས་ཀྱི་མངར་ཟས་བཅས་ཚུད་ཡོད། རྒྱུ་ཆ་ཡོངས་རྫོགས་ས་གནས་ས་ཐོག་ནས་ཡིན།',
    voting_deadline: 'འདེམས་ཤོག་དུས་བཅད།',
    closed: 'སྒོ་བརྒྱབ་ཟིན།',
    chef_broadcast_info: 'ཆུ་ཚོད་ {time} • མ་ཆེན་ {name}',
    shahi_paneer_rice: 'ཤ་ཧི་པ་ནིར་དང་ཟི་ར་འབྲས།',
    shahi_paneer_desc: 'རྒྱ་གར་བྱང་ཕྱོགས་ཀྱི་སྤྲི་དཀར་བྱུག་པའི་ཚོད་མ་དང་། ཞིམ་མངར་བསུང་ལྡན་འབྲས་སིལ། ཀུ་ཀུམ་གྲང་ཚལ་བཅས།',
    fallback_menu_date: 'གཟའ་མིག་དམར། ཕྱི་ཟླ་ལྔ་པའི་ཚེས་ ༡༣',

    // Chef Dashboard
    chef_greeting: 'སྔ་དྲོ་བདེ་ལེགས། མ་ཆེན་ལགས།',
    total_employees: 'ལས་བཟོ་བ་ཡོངས་རྫོགས།',
    joined_lunch: 'ཉིན་ཟས་བཞེས་མཁན།',
    skipped_lunch: 'ཉིན་ཟས་མི་བཞེས་མཁན།',
    participation_rate: 'མཉམ་ཞུགས་བྱས་ཚད།',
    prep_timeline: 'གྲ་སྒྲིག་དུས་ཚོད།',
    total_plates_needed: 'དགོས་མཁོ་ཡོད་པའི་ཟས་སྡེར།',
    response_cutoff_time: 'ཞོགས་པ་ཆུ་ཚོད་ ༡༠:༠༠',
    response_cutoff_label: 'དུས་ཚོད་མཐའ་མ།',
    edit_weekly_menu: 'བདུན་རེའི་ཟས་ཐོ་བཟོ་བཅོས།',
    quick_actions: 'མགྱོགས་མྱུར་ལས་དོན།',
    broadcast: 'ཁྱབ་བསྒྲགས།',
    csv_export: 'ཡིག་ཆ་ཕྱིར་འདོན།',
    participation_details: 'མཉམ་ཞུགས་ཞིབ་ཕྲ།',
    all_filter: 'ཡོངས་རྫོགས།',
    waiting_filter: 'སྒུག་བཞིན་པ།',
    search_placeholder: 'ལས་བཟོའི་མིང་བཙལ་བ།...',
    weekly_joining: 'བདུན་རེའི་མཉམ་ཞུགས།',
    weekly_joining_desc: 'ཉིན་ལྔའི་རིང་གི་མཉམ་ཞུགས་གནས་ཚུལ།',
    no_responses_yet: 'ད་ལྟ་འདེམས་ཤོག་འཕེན་མཁན་མི་འདུག',
    no_responses_desc: 'ལས་བཟོ་བ་ཚོས་དེ་རིང་གི་ཉིན་ཟས་ལ་འདེམས་ཤོག་འཕེན་པར་སྒུག་བཞིན་པ།',
    voted_at: 'ཆུ་ཚོད་ {time} ལ། འདེམས་ཤོག་འཕངས་པ།',

    // Weekly Menu Modal
    edit_weekly_menu_title: 'བདུན་རེའི་ཟས་ཐོ་བཟོ་བཅོས།',
    target_day: 'དམིགས་འབེན་ཉིན་མོ།',
    dish_photo: 'ཟས་ཀྱི་པར།',
    dish_photo_upload_desc: 'ཟས་ཀྱི་པར་འཇུག་ཕྱིར་འདིར་གནོན།',
    dish_photo_specs: 'PNG, JPG མང་མཐར་ 5MB བར།',
    dish_name: 'ཟས་མིང་།',
    save_changes: 'ཉར་ཚགས་བྱེད་པ།',

    // Broadcast Modal
    send_broadcast: 'བརྡ་ཐོ་གཏོང་བ།',
    message_to_users: 'བརྡ་འཕྲིན་གཏོང་བ།',
    broadcast_placeholder: 'དཔེར་ན། དེ་རིང་ཉིན་ཟས་ཆུ་ཚོད་སྐར་མ་ ༡༥ འགྱངས་ཡོད།',

    // Billing Panels
    billing_payment: 'ཟླ་རེའི་རྩིས་ཐོ་དང་དངུལ་སྤྲོད།',
    billing_period: 'རྩིས་མཚམས་དུས་ཡུན།',
    amount_due: 'སྤྲོད་དགོས་པའི་དངུལ་འབོར།',
    plate_cost: 'ཟས་སྡེར་རེའི་རིན་གོང་།',
    status: 'གནས་སྟངས།',
    paid: 'སྤྲད་ཟིན།',
    unpaid: 'མ་སྤྲད་པ།',

    // Weekdays
    mon: 'གཟའ་ཟླ་བ།',
    tue: 'གཟའ་མིག་དམར།',
    wed: 'གཟའ་ལྷག་པ།',
    thu: 'གཟའ་ཕུར་བུ།',
    fri: 'གཟའ་པ་སངས།',

    // Weekdays Short
    Mon: 'ཟླ་བ།',
    Tue: 'མིག་དམར།',
    Wed: 'ལྷག་པ།',
    Thu: 'ཕུར་བུ།',
    Fri: 'པ་སངས།',

    // Additional Vote Page Keys
    unread_new: 'གསར་པ། {count}',
    mark_as_read: 'ཀླགས་ཟིན་པར་བྱེད་པ།',
    voting_deadline_timer: 'འདེམས་ཤོག་དུས་བཅད། {time}',
    vote_submitted: 'འདེམས་ཤོག་ལམ་ལྷོང་ངང་འཁོད་སོང་།',

    // Additional Billing Keys
    monthly_lunch_billing: 'ཟླ་རེའི་ཉིན་ཟས་རྩིས་ཐོ།',
    meals_joined: 'ཞལ་ལག་བཞེས་པའི་གྲངས།',
    cost_per_plate: 'ཟས་སྡེར་རེའི་རིན་གོང་།',
    total_due: 'སྤྲོད་དགོས་པའི་དངུལ་འབོར་ཁྱོན་བསྡོམས།',
    no_billing_this_month: 'ཟླ་འདིར་རྩིས་ཐོ་མི་འདུག',
    chef_upload_info: 'མ་ཆེན་གྱིས་ཟླ་རེའི་རྩིས་ཐོ་གྲ་སྒྲིག་ཟིན་སྐབས་འདི་རུ་འཇུག་ངེས།',
    accountant_upload_info: 'རྩིས་པ་ལགས་ཀྱིས་ཟླ་རེའི་རྩིས་ཐོ་གྲ་སྒྲིག་ཟིན་སྐབས་འདི་རུ་འཇུག་ངེས།',
    billing_history: 'སྔོན་གྱི་རྩིས་ཐོ།',
    no_previous_billing: 'སྔོན་གྱི་རྩིས་ཐོ་མི་འདུག',
    meals_joined_count: 'ཞལ་ལག་ {count} བཞེས་ཟིན།',
    loading_billing: 'རྩིས་ཐོ་བཟོ་བཞིན་པ།...',

    // Chef Billing Keys
    total_bill: 'རྩིས་ཐོ་ཁྱོན་བསྡོམས།',
    total_plates: 'ཟས་སྡེར་ཁྱོན་བསྡོམས།',
    per_plate_cost: 'ཟས་སྡེར་རེའི་རིན་གོང་།',
    paid_users: 'དངུལ་སྤྲད་ཟིན་པའི་མི་གྲངས།',
    unpaid_users: 'དངུལ་མ་སྤྲད་པའི་མི་གྲངས།',
    bill_receipt: 'རྩིས་འཛིན་འཛིན་ཡིག — {period}',
    user_billing: 'ལས་བཟོའི་རྩིས་ཐོ — {period}',
    upload_bill: 'རྩིས་ཐོ་འཇུག་པ — {period}',
    no_bill_exists: 'དུས་ཡུན་འདིར་རྩིས་ཐོ་མི་འདུག ཟས་ཁང་གི་རྩིས་ཐོ་ཁྱོན་བསྡོམས་འཇུག་རོགས། — མཉམ་ཞུགས་བྱས་པའི་ཟས་སྡེར་རྣམས་རང་བཞིན་གྱིས་རྩིས།',
    total_bill_amount: 'རྩིས་ཐོ་ཁྱོན་བསྡོམས་ཀྱི་དངུལ་འབོར། (སྒོར་ ₹)',
    notes_optional: 'ཟུར་མཆན། (འདེམས་ཚན།)',
    generate_monthly_bill: 'ཟླ་རེའི་རྩིས་ཐོ་བཟོ་བ།',
    drag_drop_bill_image: 'རྩིས་ཐོའི་པར་འདི་རུ་འདྲུད་དེ་བཞག་གམ་གནོན་ནས་འཇུག',
    drag_drop_specs: 'PNG, JPG, WebP མང་མཐར་ 5MB བར།',
    search_users: 'ལས་བཟོ་བ་འཚོལ་བ།...',
    user_column: 'ལས་བཟོ་བ།',
    joined_column: 'མཉམ་ཞུགས།',
    amount_due_column: 'སྤྲོད་དགོས་པའི་དངུལ་འབོར།',
    status_column: 'གནས་སྟངས།',
    paid_at_column: 'དངུལ་སྤྲད་པའི་དུས་ཚོད།',
    action_column: 'བྱ་གཞག',
    mark_unpaid: 'མ་སྤྲད་པར་འཇོག་པ།',
    mark_paid: 'སྤྲད་ཟིན་པར་འཇོག་པ།',
    no_matching_users: 'མཐུན་པའི་ལས་བཟོ་བ་མི་འདུག',
    page_indicator: 'ཤོག་ལྷེ {page} ནས {totalPages} བར། (ལས་བཟོ {count})',

    // Dish Name Mappings
    'Chicken Curry Rice': 'བྱ་ཤའི་ཚོད་མ་དང་འབྲས།',
    'Shahi Paneer Rice': 'ཤ་ཧི་པ་ནིར་དང་འབྲས།',
    'Shahi Paneer with Jeera Rice': 'ཤ་ཧི་པ་ནིར་དང་ཟི་ར་འབྲས།',
    'Red Bean Rice Curd': 'རྒྱ་སྲན་དང་འབྲས་ཞོ།',
    'Aloo Phinksha Tingmo': 'ཞོག་ཁོག་ཕིང་ཤ་དང་ཏིང་མོག',
    'Egg Chowmein': 'སྒོ་ངའི་རྒྱ་ཐུག',

    // Description Mappings
    chicken_curry_desc: 'བྱ་ཤའི་ཚོད་མ་སྤོད་ཡར་ལྡན་པ་དང་འབྲས་སིལ་བཅས།',
    red_bean_desc: 'རྒྱ་སྲན་ཚོད་མ་ཞིམ་པོ་དང་འབྲས་དང་ཞོ་བཅས།',
    aloo_phinksha_desc: 'བོད་ཀྱི་ཐུན་མོང་མ་ཡིན་པའི་ཞོག་ཁོག་ཕིང་ཤ་དང་སྤྲི་མོག་བཅས།',
    egg_chowmein_desc: 'སྒོ་ང་དང་ཚལ་རིགས་བརྔོས་པའི་རྒྱ་ཐུག་བཅས།',
    chefs_special: 'དེ་རིང་གི་མ་ཆེན་གསོལ་ཚིགས་དམིགས་བསལ།',
    menu_not_set: 'ཟས་ཐོ་བཀོད་མེད།',
    chef_not_decided: 'མ་ཆེན་གྱིས་ཐག་གཅོད་བྱས་མེད།',
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const toTibetanDigits = (strOrNum: string | number): string => {
  const tibetanDigits = ['༠', '༡', '༢', '༣', '༤', '༥', '༦', '༧', '༨', '༩'];
  return String(strOrNum).replace(/[0-9]/g, (w) => tibetanDigits[parseInt(w, 10)]);
};

export const getDishDescriptionKey = (title: string): string => {
  if (!title) return 'chefs_special';
  const tLower = title.toLowerCase();
  if (tLower.includes('shahi paneer')) return 'shahi_paneer_desc';
  if (tLower.includes('chicken curry')) return 'chicken_curry_desc';
  if (tLower.includes('red bean')) return 'red_bean_desc';
  if (tLower.includes('aloo phinksha')) return 'aloo_phinksha_desc';
  if (tLower.includes('egg chowmein') || tLower.includes('chowmein')) return 'egg_chowmein_desc';
  return 'chefs_special';
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language from localStorage client-side
  useEffect(() => {
    const saved = localStorage.getItem('mealbuddy_lang');
    if (saved === 'en' || saved === 'bo') {
      setLanguageState(saved);
    }
  }, []);

  // Update root html lang attribute for accessibility/SEO
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('mealbuddy_lang', lang);
  };

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const dict = translations[language];
    let value = (dict as any)[key] || (translations['en'] as any)[key] || key;

    if (replacements) {
      Object.entries(replacements).forEach(([k, val]) => {
        value = value.replace(`{${k}}`, String(val));
      });
    }

    if (language === 'bo') {
      value = toTibetanDigits(value);
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative z-[90]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/70 hover:bg-white border border-slate-200/60 backdrop-blur-md rounded-2xl shadow-sm hover:shadow transition-all duration-300 text-sm font-bold text-[#1F2A44] select-none"
      >
        <Globe size={16} className="text-[#2E5A88] animate-spin-slow" />
        <span>{language === 'en' ? 'English' : 'བོད་ཡིག'}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay to close the switcher */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-xl border border-slate-100/80 p-1.5 z-50 overflow-hidden"
            >
              <button
                onClick={() => {
                  setLanguage('en');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${language === 'en'
                  ? 'bg-[#2E5A88]/10 text-[#2E5A88]'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <span>English</span>
                {language === 'en' && <span className="w-1.5 h-1.5 bg-[#2E5A88] rounded-full" />}
              </button>
              <button
                onClick={() => {
                  setLanguage('bo');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${language === 'bo'
                  ? 'bg-[#2E5A88]/10 text-[#2E5A88]'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <span>བོད་ཡིག</span>
                {language === 'bo' && <span className="w-1.5 h-1.5 bg-[#2E5A88] rounded-full" />}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}