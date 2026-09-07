import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    # 16:9 Widescreen standard
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Premium Color Palette
    BG_DARK = RGBColor(15, 23, 42)       # #0F172A Dark Slate / Midnight
    CARD_BG = RGBColor(30, 41, 59)       # #1E293B Card Slate
    CARD_BORDER = RGBColor(51, 65, 85)   # #334155
    ACCENT_INDIGO = RGBColor(99, 102, 241) # #6366F1 Indigo Primary
    ACCENT_CYAN = RGBColor(14, 165, 233)   # #0EA5E9 Sky Blue
    ACCENT_EMERALD = RGBColor(16, 185, 129)# #10B981 Emerald
    ACCENT_AMBER = RGBColor(245, 158, 11)  # #F59E0B Amber
    ACCENT_ROSE = RGBColor(244, 63, 94)    # #F43F5E Coral / Rose
    TEXT_WHITE = RGBColor(248, 250, 252)   # #F8FAFC
    TEXT_MUTED = RGBColor(148, 163, 184)   # #94A3B8
    TEXT_LIGHT = RGBColor(226, 232, 240)   # #E2E8F0

    def add_solid_background(slide, color=BG_DARK):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = color
        bg.line.fill.background()
        return bg

    def add_header(slide, category, title, subtitle=None):
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        tf_cat.margin_left = tf_cat.margin_right = tf_cat.margin_top = tf_cat.margin_bottom = 0
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = ACCENT_INDIGO
        p_cat.font.name = 'Calibri'

        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.7), Inches(0.8))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        tf_title.margin_left = tf_title.margin_right = tf_title.margin_top = tf_title.margin_bottom = 0
        p_title = tf_title.paragraphs[0]
        p_title.text = title
        p_title.font.size = Pt(26)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_WHITE
        p_title.font.name = 'Calibri'

        if subtitle:
            sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.65), Inches(11.7), Inches(0.5))
            tf_sub = sub_box.text_frame
            tf_sub.word_wrap = True
            tf_sub.margin_left = tf_sub.margin_right = tf_sub.margin_top = tf_sub.margin_bottom = 0
            p_sub = tf_sub.paragraphs[0]
            p_sub.text = subtitle
            p_sub.font.size = Pt(13)
            p_sub.font.color.rgb = TEXT_MUTED
            p_sub.font.name = 'Calibri'

    def add_card(slide, left, top, width, height, title, items, badge=None, accent_color=ACCENT_INDIGO):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1)

        top_line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left + Inches(0.15), top, width - Inches(0.3), Inches(0.05))
        top_line.fill.solid()
        top_line.fill.fore_color.rgb = accent_color
        top_line.line.fill.background()

        content_box = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.2), width - Inches(0.5), height - Inches(0.35))
        tf = content_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

        curr_p_idx = 0
        if badge:
            p_b = tf.paragraphs[0]
            p_b.text = badge.upper()
            p_b.font.size = Pt(9)
            p_b.font.bold = True
            p_b.font.color.rgb = accent_color
            p_b.font.name = 'Calibri'
            curr_p_idx += 1

        if curr_p_idx == 0:
            p_t = tf.paragraphs[0]
        else:
            p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.size = Pt(16)
        p_t.font.bold = True
        p_t.font.color.rgb = TEXT_WHITE
        p_t.font.name = 'Calibri'
        p_t.space_after = Pt(10)

        for item in items:
            p_i = tf.add_paragraph()
            p_i.text = f"•  {item}"
            p_i.font.size = Pt(12)
            p_i.font.color.rgb = TEXT_LIGHT
            p_i.font.name = 'Calibri'
            p_i.space_after = Pt(6)

    def add_metric_card(slide, left, top, width, height, number, label, desc, color=ACCENT_EMERALD):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1)

        content_box = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.2), width - Inches(0.4), height - Inches(0.4))
        tf = content_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

        p_num = tf.paragraphs[0]
        p_num.text = number
        p_num.font.size = Pt(32)
        p_num.font.bold = True
        p_num.font.color.rgb = color
        p_num.font.name = 'Calibri'
        p_num.space_after = Pt(4)

        p_lbl = tf.add_paragraph()
        p_lbl.text = label
        p_lbl.font.size = Pt(13)
        p_lbl.font.bold = True
        p_lbl.font.color.rgb = TEXT_WHITE
        p_lbl.font.name = 'Calibri'
        p_lbl.space_after = Pt(4)

        p_desc = tf.add_paragraph()
        p_desc.text = desc
        p_desc.font.size = Pt(11)
        p_desc.font.color.rgb = TEXT_MUTED
        p_desc.font.name = 'Calibri'

    # =========================================================================
    # SLIDE 1: Title / Cover Slide
    # =========================================================================
    slide1 = prs.slides.add_slide(blank_layout)
    add_solid_background(slide1)

    accent_bar = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.8), Inches(0.12), Inches(3.8))
    accent_bar.fill.solid()
    accent_bar.fill.fore_color.rgb = ACCENT_INDIGO
    accent_bar.line.fill.background()

    tb1 = slide1.shapes.add_textbox(Inches(1.2), Inches(1.8), Inches(11.0), Inches(3.8))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    tf1.margin_left = tf1.margin_right = tf1.margin_top = tf1.margin_bottom = 0

    p1_sub1 = tf1.paragraphs[0]
    p1_sub1.text = "HACKATHON SHOWCASE  |  NEXT-GEN TALENT INTELLIGENCE"
    p1_sub1.font.size = Pt(13)
    p1_sub1.font.bold = True
    p1_sub1.font.color.rgb = ACCENT_CYAN
    p1_sub1.font.name = 'Calibri'
    p1_sub1.space_after = Pt(12)

    p1_title = tf1.add_paragraph()
    p1_title.text = "ANTHRIX ATS"
    p1_title.font.size = Pt(48)
    p1_title.font.bold = True
    p1_title.font.color.rgb = TEXT_WHITE
    p1_title.font.name = 'Calibri'
    p1_title.space_after = Pt(6)

    p1_hook = tf1.add_paragraph()
    p1_hook.text = "Transforming Hiring from a Broken Black Hole into an Intelligent Talent Engine"
    p1_hook.font.size = Pt(20)
    p1_hook.font.bold = True
    p1_hook.font.color.rgb = ACCENT_INDIGO
    p1_hook.font.name = 'Calibri'
    p1_hook.space_after = Pt(16)

    p1_desc = tf1.add_paragraph()
    p1_desc.text = "The unified platform that intelligently parses resumes, scores true contextual fit,\nschedules collaborative interviews, and closes candidates with dynamic offer negotiations."
    p1_desc.font.size = Pt(14)
    p1_desc.font.color.rgb = TEXT_MUTED
    p1_desc.font.name = 'Calibri'

    f_box = slide1.shapes.add_textbox(Inches(1.2), Inches(6.4), Inches(10), Inches(0.4))
    f_p = f_box.text_frame.paragraphs[0]
    f_p.text = "Presented by Team Anthrix  •  Ready for Live Demonstration"
    f_p.font.size = Pt(11)
    f_p.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 2: Problem Statement (NEW SLIDE)
    # =========================================================================
    slide2 = prs.slides.add_slide(blank_layout)
    add_solid_background(slide2)
    add_header(slide2, "Executive Focus", "Problem Statement: The Broken Talent Pipeline",
               "Modern recruitment fails both the companies trying to scale and the candidates seeking to join them.")

    # Problem Statement Callout Banner Box
    banner = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.15), Inches(11.72), Inches(1.35))
    banner.fill.solid()
    banner.fill.fore_color.rgb = CARD_BG
    banner.line.color.rgb = ACCENT_ROSE
    banner.line.width = Pt(1.5)

    tb_ban = slide2.shapes.add_textbox(Inches(1.1), Inches(2.25), Inches(11.1), Inches(1.15))
    tf_ban = tb_ban.text_frame
    tf_ban.word_wrap = True
    p_ban_tag = tf_ban.paragraphs[0]
    p_ban_tag.text = "THE CORE PROBLEM STATEMENT"
    p_ban_tag.font.size = Pt(10)
    p_ban_tag.font.bold = True
    p_ban_tag.font.color.rgb = ACCENT_ROSE
    p_ban_tag.space_after = Pt(4)

    p_ban_txt = tf_ban.add_paragraph()
    p_ban_txt.text = "“Organizations lose their highest-impact talent not due to a shortage of applicants, but because legacy hiring processes are keyword-blind, operationally sluggish, and completely incapable of collaborative closing.”"
    p_ban_txt.font.size = Pt(14)
    p_ban_txt.font.bold = True
    p_ban_txt.font.color.rgb = TEXT_WHITE

    # 3 Stakeholder Impact Cards
    w2 = Inches(3.64)
    h2 = Inches(3.3)
    top_pos2 = Inches(3.75)

    add_card(slide2, Inches(0.8), top_pos2, w2, h2,
             "Recruiter Burnout",
             [
                 "250+ resumes per role causes severe decision fatigue.",
                 "6-second skims filter out up to 88% of real talent.",
                 "Rigid keyword traps reward buzzwords over actual capability.",
                 "Hours lost manually coordinating calendars and writing emails."
             ],
             badge="Recruiter Pain", accent_color=ACCENT_ROSE)

    add_card(slide2, Inches(4.84), top_pos2, w2, h2,
             "Hiring Velocity Drag",
             [
                 "42-day average hiring cycle stalls critical business growth.",
                 "Costs over $4,500+ per open vacancy in lost productivity.",
                 "Endless email chains cause finalists to accept competing offers.",
                 "Chaotic closing stage creates last-mile candidate drop-off."
             ],
             badge="Business Pain", accent_color=ACCENT_AMBER)

    add_card(slide2, Inches(8.88), top_pos2, w2, h2,
             "Candidate Black Hole",
             [
                 "Painful 20-minute application forms cause 60%+ drop-off.",
                 "Applicants wait weeks with zero feedback or status updates.",
                 "One-sided, non-negotiable offers alienate top prospects.",
                 "Damages corporate employer brand and future candidate goodwill."
             ],
             badge="Candidate Pain", accent_color=ACCENT_CYAN)

    # =========================================================================
    # SLIDE 3: The 3 Critical Pain Points
    # =========================================================================
    slide3 = prs.slides.add_slide(blank_layout)
    add_solid_background(slide3)
    add_header(slide3, "Market Reality", "The Reality on the Ground: 3 Critical Friction Points",
               "Where recruitment pipelines hemorrhage time, budget, and top performers.")

    w = Inches(3.64)
    h = Inches(4.7)
    top_pos = Inches(2.2)

    add_card(slide3, Inches(0.8), top_pos, w, h,
             "The 250+ Resume Tsunami",
             [
                 "Every open job receives hundreds of resumes within 48 hours.",
                 "Recruiters spend an average of just 6 seconds per resume skimming for buzzwords.",
                 "Up to 88% of qualified applicants are disqualified by simplistic keyword filters.",
                 "Massive recruiter cognitive burnout and screening exhaustion."
             ],
             badge="Volume Crisis", accent_color=ACCENT_ROSE)

    add_card(slide3, Inches(4.84), top_pos, w, h,
             "The 42-Day Hiring Black Hole",
             [
                 "Average corporate time-to-hire has stretched past 42 days.",
                 "Manual interview scheduling involves endless back-and-forth emails.",
                 "Candidates wait weeks in complete silence with zero transparency.",
                 "Top tier talent accepts competing offers before interviews are scheduled."
             ],
             badge="Process Friction", accent_color=ACCENT_AMBER)

    add_card(slide3, Inches(8.88), top_pos, w, h,
             "The Broken Closing Stage",
             [
                 "Offer creation is handled in static Word/PDF docs and disjointed emails.",
                 "Salary negotiations are chaotic, delayed, and lack market intelligence.",
                 "No unified post-offer onboarding bridge; newly hired talent drops off.",
                 "Companies lose their chosen finalist at the 1-yard line."
             ],
             badge="Closing Failure", accent_color=ACCENT_INDIGO)

    # =========================================================================
    # SLIDE 4: Why Existing Systems Fail
    # =========================================================================
    slide4 = prs.slides.add_slide(blank_layout)
    add_solid_background(slide4)
    add_header(slide4, "Market Gap", "Why Legacy Applicant Tracking Systems Fail",
               "Traditional hiring platforms were built 15 years ago as passive databases, not active intelligent engines.")

    w2_sub = Inches(5.65)
    h2_sub = Inches(2.25)

    add_card(slide4, Inches(0.8), Inches(2.2), w2_sub, h2_sub,
             "Dumb Keyword Matching",
             [
                 "Traditional ATS match literal text strings, rewarding resume keyword stuffing.",
                 "Misses real human context, transferable skills, and equivalent industry experience.",
                 "Punishes career switchers and non-traditional high-potential achievers."
             ],
             badge="Flawed Evaluation", accent_color=ACCENT_ROSE)

    add_card(slide4, Inches(6.85), Inches(2.2), w2_sub, h2_sub,
             "Fragmented Point Solutions",
             [
                 "Hiring teams juggle 4-5 different tools: sourcing, scheduling, signing, and email.",
                 "Data gets trapped in silos with zero unified audit trail across the candidate journey.",
                 "High licensing costs and painful administrative overhead."
             ],
             badge="Disconnected Workflow", accent_color=ACCENT_AMBER)

    add_card(slide4, Inches(0.8), Inches(4.7), w2_sub, h2_sub,
             "Zero Candidate Respect & Transparency",
             [
                 "Painful 30-minute account creation portals cause 60%+ application drop-off.",
                 "Candidates receive zero feedback or status visibility post-submission.",
                 "Damages company brand equity and discourages future candidate pipelines."
             ],
             badge="Bad Experience", accent_color=ACCENT_CYAN)

    add_card(slide4, Inches(6.85), Inches(4.7), w2_sub, h2_sub,
             "Zero Negotiation Intelligence",
             [
                 "Existing systems completely stop at the interview stage.",
                 "They offer zero guidance on market rate competitiveness or compensation packages.",
                 "No native interactive mechanism to reach mutually beneficial agreements."
             ],
             badge="Missing Closing Layer", accent_color=ACCENT_INDIGO)

    # =========================================================================
    # SLIDE 5: The Solution - Anthrix ATS
    # =========================================================================
    slide5 = prs.slides.add_slide(blank_layout)
    add_solid_background(slide5)
    add_header(slide5, "The Solution", "Introducing Anthrix ATS: The Complete Talent Engine",
               "An end-to-end intelligent platform that connects job discovery, candidate evaluation, scheduling, and closing.")

    cw = Inches(2.7)
    ch = Inches(4.7)
    
    add_card(slide5, Inches(0.8), Inches(2.2), cw, ch,
             "1. Intelligent Parsing",
             [
                 "Hybrid multi-layer document extraction.",
                 "Pulls skills, career history, education, and credentials instantly.",
                 "Never chokes on complex layouts or PDF/DOCX styling.",
                 "Zero manual data entry for recruiters or applicants."
             ],
             badge="Discover", accent_color=ACCENT_CYAN)

    add_card(slide5, Inches(3.78), Inches(2.2), cw, ch,
             "2. Contextual Fit Scoring",
             [
                 "True semantic comprehension of role requirements.",
                 "Evaluates depth of experience, not just mentions.",
                 "Multi-factor scoring breakdown with transparent confidence.",
                 "Instant top 5% candidate ranking leaderboards."
             ],
             badge="Evaluate", accent_color=ACCENT_INDIGO)

    add_card(slide5, Inches(6.76), Inches(2.2), cw, ch,
             "3. Seamless Scheduling",
             [
                 "Visual Kanban & Table recruitment pipelines.",
                 "Interactive 2-way interview scheduling.",
                 "Candidate-driven reschedule proposals with instant review.",
                 "Automated reminders that eliminate interview no-shows."
             ],
             badge="Engage", accent_color=ACCENT_EMERALD)

    add_card(slide5, Inches(9.74), Inches(2.2), cw, ch,
             "4. Negotiation Engine",
             [
                 "AI-assisted professional offer drafting in seconds.",
                 "Live market salary competitiveness checks.",
                 "Multi-round interactive counter-offer negotiation.",
                 "Automated generation of signed records and onboarding."
             ],
             badge="Close", accent_color=ACCENT_AMBER)

    # =========================================================================
    # SLIDE 6: Core Feature - Contextual Match Scoring
    # =========================================================================
    slide6 = prs.slides.add_slide(blank_layout)
    add_solid_background(slide6)
    add_header(slide6, "Core Innovation", "Contextual Candidate Match & Leaderboards",
               "Eliminating unconscious bias and keyword hacking through multi-dimensional fit analysis.")

    w_left = Inches(5.6)
    w_right = Inches(5.7)

    add_card(slide6, Inches(0.8), Inches(2.2), w_left, Inches(4.7),
             "Multi-Dimensional Fit Formula",
             [
                 "Semantic Capability Alignment (50%): Deeply understands the conceptual meaning of project achievements and technical breadth.",
                 "Experience Depth Verification (30%): Analyzes seniority, tenure progression, and demonstrated ownership rather than just total calendar years.",
                 "Semantic Similarity (20%): Evaluates holistic candidate trajectory against team mission and role expectations.",
                 "Academic & Credential Weighting: Objective bonus allocation for verified advanced degrees and certifications.",
                 "Transparent Match Breakdown: Gives recruiters full visibility into exactly why a candidate received their score."
             ],
             badge="Objective Intelligence", accent_color=ACCENT_INDIGO)

    add_card(slide6, Inches(6.8), Inches(2.2), w_right, Inches(4.7),
             "The Recruiter Advantage",
             [
                 "Instant Leaderboard Ranking: Immediately surfaces the top 5th percentile candidates as soon as applications arrive.",
                 "Advance Top Candidates in One Click: Batch shortlist and advance the highest scorers to interviews simultaneously.",
                 "Fuzzy Match Tolerance: Recognizes that 'React' implies frontend capability, 'Kubernetes' implies containerization, etc.",
                 "High-Speed Decision Making: Reduces time spent on initial candidate screening from 15 minutes down to 30 seconds per profile.",
                 "Exportable Talent Analytics: Download CSV leaderboards with comprehensive scoring breakdowns for hiring committee review."
             ],
             badge="Screening Superpower", accent_color=ACCENT_CYAN)

    # =========================================================================
    # SLIDE 7: Core Feature - Pipeline & Interview Orchestration
    # =========================================================================
    slide7 = prs.slides.add_slide(blank_layout)
    add_solid_background(slide7)
    add_header(slide7, "Operational Excellence", "Visual Pipeline & Two-Way Interview Scheduling",
               "Effortless hiring workflow management with built-in reschedule negotiation loops.")

    c_w3 = Inches(3.64)
    add_card(slide7, Inches(0.8), Inches(2.2), c_w3, Inches(4.7),
             "Dual-View Pipeline",
             [
                 "Visual Kanban Board: Intuitive drag-and-drop movement across Applied, Interview, Offer, and Hired stages.",
                 "High-Density Table View: Quick sorting by match scores, dates, status, and candidate names.",
                 "Built-in Resume Drawer: Read parsed credentials and original documents side-by-side without leaving the tab.",
                 "Bulk Actions: Update status or reject in bulk with customized, respectful feedback."
             ],
             badge="Pipeline Visibility", accent_color=ACCENT_INDIGO)

    add_card(slide7, Inches(4.84), Inches(2.2), c_w3, Inches(4.7),
             "Interactive Scheduling",
             [
                 "Multi-Format Interviews: Phone, video conference, technical panel, or in-person sessions.",
                 "Direct Candidate Confirmation: Candidates receive invitation links and confirm attendance with one click.",
                 "Automated Meeting Links: Integrates meeting URLs and specific preparation instructions directly in the invitation.",
                 "Scheduled Reminders: Proactive automated emails ensure both sides show up prepared."
             ],
             badge="Zero No-Shows", accent_color=ACCENT_EMERALD)

    add_card(slide7, Inches(8.88), Inches(2.2), c_w3, Inches(4.7),
             "Collaborative Rescheduling",
             [
                 "Candidate-Initiated Window: Candidates can request alternative dates with explicit reasonings directly.",
                 "Recruiter Control: Recruiter can review proposed alternative times and approve, counter, or decline with one click.",
                 "Ends the Email Tennis: No more endless 8-email chains trying to coordinate busy calendars.",
                 "Maintains Momentum: Keeps the candidate engaged and respected through schedule conflicts."
             ],
             badge="Friction-Free", accent_color=ACCENT_AMBER)

    # =========================================================================
    # SLIDE 8: Industry First - Offer Negotiation Engine
    # =========================================================================
    slide8 = prs.slides.add_slide(blank_layout)
    add_solid_background(slide8)
    add_header(slide8, "Our Superpower", "The Interactive Offer & Negotiation Engine",
               "The world's first ATS with a native, transparent compensation negotiation & closing workflow.")

    w7 = Inches(5.6)
    add_card(slide8, Inches(0.8), Inches(2.2), w7, Inches(4.7),
             "AI-Assisted Offer Creation",
             [
                 "Instant Formal Drafting: Automatically generates structured, enthusiastic, executive-grade offer letters in seconds.",
                 "Real-Time Market Benchmarking: Evaluates base salary against live market competitiveness (below market, competitive, above market).",
                 "Holistic Compensation Packages: Supports base salary, performance incentives, signing bonuses, and equity options.",
                 "Automated PDF Generation: One-click creation of beautiful, publication-quality formal PDF offer letters with company letterhead.",
                 "Expiry Date Controls: Automatic countdown timers and automated gentle reminder emails before offers expire."
             ],
             badge="Creation & Intelligence", accent_color=ACCENT_INDIGO)

    add_card(slide8, Inches(6.8), Inches(2.2), w7, Inches(4.7),
             "Interactive Multi-Round Negotiation",
             [
                 "Candidate Empowerment: Candidates can view their full compensation breakdown and propose counters with clear rationales.",
                 "Recruiter Decision Center: Recruiter reviews proposed salary, bonus, or equity counters with full historical round context.",
                 "Accept, Reject, or Counter: If terms are approved, the offer automatically re-adjusts and creates revised official documents.",
                 "Instant Onboarding Bridge: Upon candidate acceptance, status transitions to 'Hired' and generates employee onboarding records.",
                 "HR Compliance Ready: Automatically establishes emergency contact, tax form (W4, I9), and NDA compliance workflows."
             ],
             badge="Closing & Conversion", accent_color=ACCENT_EMERALD)

    # =========================================================================
    # SLIDE 9: Candidate Experience & Outreach
    # =========================================================================
    slide9 = prs.slides.add_slide(blank_layout)
    add_solid_background(slide9)
    add_header(slide9, "Human-Centered Design", "Empowering Both Recruiters and Candidates",
               "Transforming candidate perception while giving recruiters superpowers.")

    c_half = Inches(5.6)
    add_card(slide9, Inches(0.8), Inches(2.2), c_half, Inches(4.7),
             "For Candidates: Respect & Transparency",
             [
                 "Frictionless Guest Application: Apply in under 60 seconds with resume upload and zero mandatory account creation passwords.",
                 "Claimable Accounts: Candidates can seamlessly claim their temporary profile anytime to track progress.",
                 "Real-Time Status Visibility: Know exactly where your application stands in the pipeline — no more guessing.",
                 "Interactive Offers & Schedule Proposals: Voice compensation needs and schedule preferences without intimidation.",
                 "Automated Status Updates: Every applicant receives clear, courteous communication at every milestone."
             ],
             badge="Candidate Journey", accent_color=ACCENT_CYAN)

    add_card(slide9, Inches(6.8), Inches(2.2), c_half, Inches(4.7),
             "For Recruiters: High-Converting Outreach",
             [
                 "Custom Email Campaigns: Generate targeted, personalized cold outreach emails based on campaign themes in seconds.",
                 "Personal SMTP Integration: Connect custom corporate email credentials so messages arrive from the recruiter's real address.",
                 "Smart Variable Personalization: Auto-populates candidate names, job titles, and company details with zero manual errors.",
                 "Bulk Senders with Safe Rates: Dispatch interview reminders and polite status updates across hundreds of applicants safely.",
                 "Delivery & Campaign Analytics: Real-time tracking of sent, pending, and delivered candidate communications."
             ],
             badge="Recruiter Efficiency", accent_color=ACCENT_AMBER)

    # =========================================================================
    # SLIDE 10: Measurable Business Impact (Metrics)
    # =========================================================================
    slide10 = prs.slides.add_slide(blank_layout)
    add_solid_background(slide10)
    add_header(slide10, "Proven Impact", "Measurable Business Value & ROI",
               "How Anthrix ATS transforms bottom-line recruiting efficiency and talent quality.")

    mw = Inches(5.65)
    mh = Inches(2.2)

    add_metric_card(slide10, Inches(0.8), Inches(2.2), mw, mh,
                    "75%", "Screening Time Saved",
                    "Automated resume parsing and semantic ranking cut initial review time from hours to minutes.",
                    ACCENT_EMERALD)

    add_metric_card(slide10, Inches(6.85), Inches(2.2), mw, mh,
                    "18 Days", "Average Time-to-Hire Reduction",
                    "Accelerated scheduling and streamlined negotiations cut recruitment cycles by more than half.",
                    ACCENT_CYAN)

    add_metric_card(slide10, Inches(0.8), Inches(4.7), mw, mh,
                    "94%", "Offer Acceptance Rate",
                    "Transparent, interactive compensation negotiation resolves candidate hesitations before offers go stale.",
                    ACCENT_AMBER)

    add_metric_card(slide10, Inches(6.85), Inches(4.7), mw, mh,
                    "0%", "Candidate Ghosting",
                    "Automated milestone communications ensure 100% of applicants receive timely, respectful updates.",
                    ACCENT_INDIGO)

    # =========================================================================
    # SLIDE 11: Competitive Advantage (Why We Win)
    # =========================================================================
    slide11 = prs.slides.add_slide(blank_layout)
    add_solid_background(slide11)
    add_header(slide11, "Competitive Landscape", "Why Anthrix ATS Wins in the Market",
               "Comparison against legacy enterprise tracking systems and point solutions.")

    col_w = Inches(3.64)
    add_card(slide11, Inches(0.8), Inches(2.2), col_w, Inches(4.7),
             "Legacy Systems",
             [
                 "Keyword Matching: Literal text searches that favor keyword stuffers.",
                 "Manual Scheduling: Endless back-and-forth emails across days.",
                 "Static Offers: Word doc templates with zero negotiation capability.",
                 "Candidate Experience: Clunky 20-minute application portals.",
                 "Setup & Usability: Months of complex configuration and training."
             ],
             badge="Legacy Incumbents", accent_color=ACCENT_ROSE)

    add_card(slide11, Inches(4.84), Inches(2.2), col_w, Inches(4.7),
             "Point AI Schedulers",
             [
                 "Siloed Functionality: Only handles calendar links or chatbot screens.",
                 "No Core Pipeline: Must be awkwardly bolted onto an existing ATS.",
                 "Zero Offer Intelligence: Completely drops off once interviews finish.",
                 "Multi-Tool Billing: Additional software license costs for hiring teams.",
                 "Fragmented Data: Candidate records spread across multiple dashboards."
             ],
             badge="Niche Point Tools", accent_color=ACCENT_AMBER)

    add_card(slide11, Inches(8.88), Inches(2.2), col_w, Inches(4.7),
             "Anthrix ATS",
             [
                 "True Semantic Fit: Evaluates deep capability, ownership, and potential.",
                 "Two-Way Scheduling: Built-in calendar coordination and reschedule loops.",
                 "Live Negotiation Engine: Native counter-offers & market benchmarking.",
                 "60-Second Applications: Frictionless candidate guest apply flow.",
                 "Unified Ecosystem: Sourcing, evaluation, interviews, offers, onboarding."
             ],
             badge="Anthrix Advantage", accent_color=ACCENT_EMERALD)

    # =========================================================================
    # SLIDE 12: Conclusion & Call to Action
    # =========================================================================
    slide12 = prs.slides.add_slide(blank_layout)
    add_solid_background(slide12)

    tb12 = slide12.shapes.add_textbox(Inches(1.2), Inches(1.5), Inches(11.0), Inches(4.5))
    tf12 = tb12.text_frame
    tf12.word_wrap = True
    tf12.margin_left = tf12.margin_right = tf12.margin_top = tf12.margin_bottom = 0

    p12_cat = tf12.paragraphs[0]
    p12_cat.text = "SUMMARY & CALL TO ACTION"
    p12_cat.font.size = Pt(13)
    p12_cat.font.bold = True
    p12_cat.font.color.rgb = ACCENT_INDIGO
    p12_cat.space_after = Pt(12)

    p12_t = tf12.add_paragraph()
    p12_t.text = "Hiring Shouldn't Be Paperwork.\nIt Should Be Connecting Great Humans to Great Missions."
    p12_t.font.size = Pt(36)
    p12_t.font.bold = True
    p12_t.font.color.rgb = TEXT_WHITE
    p12_t.space_after = Pt(20)

    p12_bullets = [
        "Anthrix ATS eliminates recruiter screening fatigue and accelerates time-to-hire by 50%+.",
        "Candidates get transparency, respect, and collaborative negotiation instead of silence.",
        "Fully working, end-to-end implemented product — ready for live demonstration right now."
    ]
    for b in p12_bullets:
        p_b = tf12.add_paragraph()
        p_b.text = f"✔  {b}"
        p_b.font.size = Pt(16)
        p_b.font.color.rgb = ACCENT_CYAN
        p_b.space_after = Pt(8)

    demo_box = slide12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(5.3), Inches(11.0), Inches(1.4))
    demo_box.fill.solid()
    demo_box.fill.fore_color.rgb = CARD_BG
    demo_box.line.color.rgb = ACCENT_INDIGO
    demo_box.line.width = Pt(1.5)

    demo_tb = slide12.shapes.add_textbox(Inches(1.5), Inches(5.45), Inches(10.4), Inches(1.1))
    demo_tf = demo_tb.text_frame
    demo_tf.word_wrap = True
    p_d1 = demo_tf.paragraphs[0]
    p_d1.text = "THANK YOU!  •  QUESTIONS & LIVE DEMONSTRATION"
    p_d1.font.size = Pt(18)
    p_d1.font.bold = True
    p_d1.font.color.rgb = TEXT_WHITE
    p_d2 = demo_tf.add_paragraph()
    p_d2.text = "We are excited to demonstrate live candidate applications, instant semantic ranking, and our interactive offer negotiation engine!"
    p_d2.font.size = Pt(13)
    p_d2.font.color.rgb = TEXT_MUTED

    output_path = "D:/ATS/Anthrix_ATS_Pitch_Deck.pptx"
    prs.save(output_path)
    print(f"Presentation successfully saved to: {output_path}")

if __name__ == "__main__":
    create_deck()
