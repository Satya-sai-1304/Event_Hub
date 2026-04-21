import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Search, CalendarCheck, PartyPopper, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "Browse Events",
    description: "Explore hundreds of amazing events across categories. Find weddings, concerts, corporate events, and more.",
    color: "from-purple-500 to-indigo-600",
    bgColor: "bg-purple-100",
    textColor: "text-purple-600",
  },
  {
    icon: CalendarCheck,
    title: "Book Event",
    description: "Select your preferred event, choose the number of guests, and complete booking with secure payment.",
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-100",
    textColor: "text-pink-600",
  },
  {
    icon: PartyPopper,
    title: "Enjoy Event",
    description: "Receive instant confirmation and enjoy your special day! Create memories that last a lifetime.",
    color: "from-orange-500 to-amber-600",
    bgColor: "bg-orange-100",
    textColor: "text-orange-600",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Book your perfect event in three simple steps
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-200 via-pink-200 to-orange-200 -translate-y-1/2 z-0" />

          {STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="relative z-10"
            >
              <Card className="glass-card border-0 shadow-xl hover-lift h-full overflow-hidden group">
                <CardContent className="p-8 flex flex-col items-center text-center">
                  {/* Step Number Badge */}
                  <div className={`absolute top-4 right-4 w-8 h-8 rounded-full ${step.bgColor} ${step.textColor} flex items-center justify-center font-bold text-sm`}>
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <step.icon className="w-10 h-10 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-display font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 leading-relaxed mb-6">
                    {step.description}
                  </p>

                  {/* Arrow Icon */}
                  {index < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                      <ArrowRight className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 mb-4">Ready to get started?</p>
          <button
            onClick={() => window.location.href = "/login"}
            className="inline-flex items-center gap-2 gradient-primary text-white font-medium px-8 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            Start Exploring Events
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center"
        >
          {[
            { label: "Instant Confirmation", desc: "Get immediate booking confirmation" },
            { label: "Secure Payments", desc: "100% secure payment gateway" },
            { label: "24/7 Support", desc: "Round-the-clock customer support" },
          ].map((feature) => (
            <div key={feature.label} className="flex flex-col items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <p className="font-semibold text-gray-900">{feature.label}</p>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
