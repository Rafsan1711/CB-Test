import React from 'react';
import { motion } from 'framer-motion';
import { Github, Server, Database, BrainCircuit, GitBranch, Webhook, FileCode, CheckCircle2, ArrowDown } from 'lucide-react';

const Node = ({ icon, title, description, delay, color }: { icon: React.ReactNode, title: string, description: string, delay: number, color: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="bg-[#161B22] border border-gray-800 rounded-xl p-5 flex flex-col items-center text-center hover:border-gray-600 transition-colors shadow-lg w-full max-w-[200px]"
  >
    <div className={`w-12 h-12 rounded-full bg-[#0D1117] border border-gray-800 flex items-center justify-center mb-3 ${color}`}>
      {icon}
    </div>
    <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
    <p className="text-xs text-gray-400">{description}</p>
  </motion.div>
);

const Connector = ({ delay }: { delay: number }) => (
  <motion.div 
    initial={{ opacity: 0, height: 0 }}
    whileInView={{ opacity: 1, height: 40 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="flex justify-center text-gray-600"
  >
    <ArrowDown size={24} />
  </motion.div>
);

export const Architecture: React.FC = () => {
  return (
    <section className="py-24 bg-[#0D1117] border-t border-gray-800">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">System Architecture</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">A deep dive into ContriBot's autonomous engineering pipeline.</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          {/* Layer 1 */}
          <div className="flex gap-4 w-full justify-center">
            <Node icon={<Github size={20} />} title="GitHub" description="Issues, PRs, Webhooks" delay={0.1} color="text-[#58A6FF]" />
            <Node icon={<Webhook size={20} />} title="Webhook Handler" description="Event parsing & validation" delay={0.2} color="text-[#00FF88]" />
          </div>
          <Connector delay={0.3} />

          {/* Layer 2 */}
          <div className="flex gap-4 w-full justify-center">
            <Node icon={<Server size={20} />} title="Task Queue" description="Background job management" delay={0.4} color="text-yellow-400" />
            <Node icon={<GitBranch size={20} />} title="Agent Controller" description="Workflow orchestration" delay={0.5} color="text-purple-400" />
          </div>
          <Connector delay={0.6} />

          {/* Layer 3 */}
          <div className="flex gap-4 w-full justify-center">
            <Node icon={<BrainCircuit size={20} />} title="Context Builder" description="Repo analysis & tree building" delay={0.7} color="text-pink-400" />
            <Node icon={<FileCode size={20} />} title="Code Generator" description="Implementation & PR creation" delay={0.8} color="text-orange-400" />
            <Node icon={<CheckCircle2 size={20} />} title="Multi-Model Verifier" description="Consensus-based review" delay={0.9} color="text-[#00FF88]" />
          </div>
          <Connector delay={1.0} />

          {/* Layer 4 */}
          <div className="flex gap-4 w-full justify-center">
            <Node icon={<Database size={20} />} title="PostgreSQL" description="Task state, logs, settings" delay={1.1} color="text-blue-400" />
          </div>
        </div>
      </div>
    </section>
  );
};
